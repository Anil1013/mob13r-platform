import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

/* ================= CONFIG ================= */
const MAX_MSISDN_DAILY = 3;
const MAX_OTP_ATTEMPTS = 5;

/* ================= DAILY RESET ================= */
async function resetDailyHits() {
  await pool.query(`
    UPDATE offers
    SET today_hits = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE
  `);
}

/* ================= MSISDN DAILY LIMIT ================= */
async function isMsisdnLimitReached(msisdn) {
  const result = await pool.query(
    `
    SELECT COUNT(*) 
    FROM pin_sessions
    WHERE msisdn = $1
      AND created_at::date = CURRENT_DATE
    `,
    [msisdn]
  );

  return Number(result.rows[0].count) >= MAX_MSISDN_DAILY;
}

/* ================= FIND FALLBACK ================= */
async function findFallbackOffer(primary) {
  const result = await pool.query(
    `
    SELECT *
    FROM offers
    WHERE advertiser_id = $1
      AND geo = $2
      AND carrier = $3
      AND service_type = 'FALLBACK'
      AND (daily_cap IS NULL OR today_hits < daily_cap)
    LIMIT 1
    `,
    [primary.advertiser_id, primary.geo, primary.carrier]
  );

  return result.rows[0] || null;
}

/* =====================================================
   🔐 PIN SEND (GET + POST)
===================================================== */
router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    await resetDailyHits();

    const { offer_id } = req.params;
    const incomingParams = { ...req.query, ...req.body };
    const msisdn = incomingParams.msisdn;

    if (!msisdn) {
      return res.status(400).json({ message: "msisdn is required" });
    }

    /* 🔐 MSISDN LIMIT */
    if (await isMsisdnLimitReached(msisdn)) {
      return res.status(429).json({
        message: "MSISDN daily limit reached",
      });
    }

    /* 1️⃣ LOAD PRIMARY OFFER */
    const offerRes = await pool.query(
      `
      SELECT *
      FROM offers
      WHERE id = $1
        AND service_type = 'NORMAL'
      `,
      [offer_id]
    );

    if (!offerRes.rows.length) {
      return res.status(404).json({ message: "Primary offer not found" });
    }

    let offer = offerRes.rows[0];
    let route = "PRIMARY";

    /* 2️⃣ CAP CHECK (skip if unlimited) */
    if (
      offer.daily_cap &&
      offer.today_hits >= offer.daily_cap
    ) {
      const fallback = await findFallbackOffer(offer);

      if (!fallback) {
        return res.status(429).json({
          message: "Primary cap reached, no fallback available",
        });
      }

      offer = fallback;
      route = "FALLBACK";
    }

    /* 3️⃣ LOAD OFFER PARAMS */
    const paramRes = await pool.query(
      `
      SELECT param_key, param_value
      FROM offer_parameters
      WHERE offer_id = $1
      `,
      [offer.id]
    );

    let staticParams = {};
    paramRes.rows.forEach((p) => {
      staticParams[p.param_key] = p.param_value;
    });

    const pinSendUrl =
      staticParams.pin_send_url || staticParams.operator_send_url;

    if (!pinSendUrl) {
      return res.status(500).json({
        message: "PIN send URL missing",
      });
    }

    /* 4️⃣ FINAL PARAMS */
    const finalParams = {
      ...staticParams,
      ...incomingParams,
      msisdn,
    };

    const sessionToken = uuidv4();

    await pool.query(
      `
      INSERT INTO pin_sessions
      (offer_id, msisdn, session_token, params, status)
      VALUES ($1, $2, $3, $4, 'OTP_SENT')
      `,
      [offer.id, msisdn, sessionToken, finalParams]
    );

    /* 5️⃣ OPERATOR PIN SEND */
    const method = staticParams.request_method || "POST";

    if (method === "GET") {
      await axios.get(pinSendUrl, { params: finalParams });
    } else {
      await axios.post(pinSendUrl, finalParams);
    }

    /* 6️⃣ INCREMENT HIT (only after success) */
    await pool.query(
      `
      UPDATE offers
      SET today_hits = today_hits + 1
      WHERE id = $1
      `,
      [offer.id]
    );

    return res.json({
      status: "OTP_SENT",
      session_token: sessionToken,
      route,
      offer_id: offer.id,
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err.message);
    return res.status(500).json({ message: "PIN send failed" });
  }
});

/* =====================================================
   🔐 PIN VERIFY
===================================================== */
router.post("/pin/verify", async (req, res) => {
  try {
    const { session_token, otp } = req.body;

    if (!session_token || !otp) {
      return res.status(400).json({
        message: "session_token and otp required",
      });
    }

    /* 1️⃣ LOAD SESSION */
    const sessionRes = await pool.query(
      `
      SELECT *
      FROM pin_sessions
      WHERE session_token = $1
        AND status = 'OTP_SENT'
      `,
      [session_token]
    );

    if (!sessionRes.rows.length) {
      return res.status(400).json({ message: "Invalid session" });
    }

    const session = sessionRes.rows[0];

    if (session.otp_attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        message: "OTP attempts exceeded",
      });
    }

    /* 2️⃣ LOAD OFFER PARAMS */
    const paramRes = await pool.query(
      `
      SELECT param_key, param_value
      FROM offer_parameters
      WHERE offer_id = $1
      `,
      [session.offer_id]
    );

    let staticParams = {};
    paramRes.rows.forEach((p) => {
      staticParams[p.param_key] = p.param_value;
    });

    const verifyParams = {
      ...session.params,
      otp,
    };

    const pinVerifyUrl =
      staticParams.pin_verify_url || staticParams.operator_verify_url;

    const method = staticParams.request_method || "POST";

    try {
      if (method === "GET") {
        await axios.get(pinVerifyUrl, { params: verifyParams });
      } else {
        await axios.post(pinVerifyUrl, verifyParams);
      }
    } catch (err) {
      await pool.query(
        `
        UPDATE pin_sessions
        SET otp_attempts = otp_attempts + 1
        WHERE id = $1
        `,
        [session.id]
      );
      throw err;
    }

    /* ✅ VERIFIED */
    await pool.query(
      `
      UPDATE pin_sessions
      SET status = 'VERIFIED',
          verified_at = NOW()
      WHERE id = $1
      `,
      [session.id]
    );

    return res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err.message);
    return res.status(500).json({ message: "PIN verify failed" });
  }
});

export default router;
