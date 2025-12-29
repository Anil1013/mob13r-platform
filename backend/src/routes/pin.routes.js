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
      AND status = 'active'
      AND (daily_cap IS NULL OR today_hits < daily_cap)
    ORDER BY id ASC
    LIMIT 1
    `,
    [primary.advertiser_id, primary.geo, primary.carrier]
  );

  return result.rows[0] || null;
}

/* ================= HELPER ================= */
function getAdvMethod(staticParams) {
  const m = (staticParams.method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(m)) {
    throw new Error("Invalid method in panel (use GET or POST)");
  }
  return m;
}

/* =====================================================
   🔐 PIN SEND
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

    if (await isMsisdnLimitReached(msisdn)) {
      return res.status(429).json({ message: "MSISDN daily limit reached" });
    }

    /* Load primary offer */
    const offerRes = await pool.query(
      `
      SELECT *
      FROM offers
      WHERE id = $1
        AND service_type = 'NORMAL'
        AND status = 'active'
      `,
      [offer_id]
    );

    if (!offerRes.rows.length) {
      return res.status(404).json({ message: "Primary offer not found" });
    }

    let offer = offerRes.rows[0];
    let route = "PRIMARY";

    /* CAP CHECK */
    if (offer.daily_cap && offer.today_hits >= offer.daily_cap) {
      const fallback = await findFallbackOffer(offer);
      if (!fallback) {
        return res.status(429).json({
          message: "Primary cap reached, no fallback available",
        });
      }
      offer = fallback;
      route = "FALLBACK";
    }

    /* LOAD OFFER PARAMS */
    const paramRes = await pool.query(
      `
      SELECT param_key, param_value
      FROM offer_parameters
      WHERE offer_id = $1
      `,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach((p) => {
      staticParams[p.param_key] = p.param_value;
    });

    const pinSendUrl = staticParams.pin_send_url;
    if (!pinSendUrl) {
      return res.status(500).json({ message: "pin_send_url missing" });
    }

    const advMethod = getAdvMethod(staticParams);

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

    /* CALL ADV */
    let advResp;
    if (advMethod === "GET") {
      advResp = await axios.get(pinSendUrl, { params: finalParams });
    } else {
      advResp = await axios.post(pinSendUrl, finalParams);
    }

    const advData = advResp.data;
    const advSessionKey = advData?.sessionKey;

    if (advSessionKey) {
      await pool.query(
        `
        UPDATE pin_sessions
        SET adv_session_key = $1
        WHERE session_token = $2
        `,
        [advSessionKey, sessionToken]
      );
    }

    await pool.query(
      `UPDATE offers SET today_hits = today_hits + 1 WHERE id = $1`,
      [offer.id]
    );

    return res.json({
      status: "OTP_SENT",
      route,
      offer_id: offer.id,
      session_token: sessionToken,
      adv_response: advData,
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      message: "PIN send failed",
      error: err.response?.data || err.message,
    });
  }
});

/* =====================================================
   🔐 PIN VERIFY (✔ OTP VALIDATION FIXED)
===================================================== */
router.post("/pin/verify", async (req, res) => {
  try {
    const { session_token, otp } = req.body;

    if (!session_token || !otp) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token and otp required",
      });
    }

    /* Load session */
    const sessionRes = await pool.query(
      `
      SELECT *
      FROM pin_sessions
      WHERE session_token = $1
      `,
      [session_token]
    );

    if (!sessionRes.rows.length) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid session",
      });
    }

    const session = sessionRes.rows[0];

    /* Retry limit */
    if (session.otp_attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        status: "BLOCKED",
        message: "OTP attempts exceeded",
      });
    }

    /* Load offer params */
    const paramRes = await pool.query(
      `
      SELECT param_key, param_value
      FROM offer_parameters
      WHERE offer_id = $1
      `,
      [session.offer_id]
    );

    const staticParams = {};
    paramRes.rows.forEach((p) => {
      staticParams[p.param_key] = p.param_value;
    });

    const pinVerifyUrl = staticParams.verify_pin_url;
    if (!pinVerifyUrl) {
      return res.status(500).json({
        status: "FAILED",
        message: "verify_pin_url missing",
      });
    }

    const advMethod = getAdvMethod(staticParams);

    const verifyPayload = {
      ...session.params,
      otp,
      sessionKey: session.adv_session_key,
    };

    /* CALL ADV VERIFY */
    let advResp;
    if (advMethod === "GET") {
      advResp = await axios.get(pinVerifyUrl, { params: verifyPayload });
    } else {
      advResp = await axios.post(pinVerifyUrl, verifyPayload);
    }

    const advData = advResp.data;

    /* ❌ OTP WRONG */
    if (!advData || advData.status !== true) {
      await pool.query(
        `
        UPDATE pin_sessions
        SET otp_attempts = otp_attempts + 1
        WHERE session_token = $1
        `,
        [session_token]
      );

      return res.status(400).json({
        status: "OTP_INVALID",
        adv_response: advData,
      });
    }

    /* ✅ OTP CORRECT */
    await pool.query(
      `
      UPDATE pin_sessions
      SET status = 'VERIFIED',
          verified_at = NOW()
      WHERE session_token = $1
      `,
      [session_token]
    );

    return res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err.response?.data || err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "PIN verify failed",
      error: err.response?.data || err.message,
    });
  }
});

/* =====================================================
   🔁 CHECK STATUS
===================================================== */
router.get("/pin/status", async (req, res) => {
  try {
    const { session_token, msisdn } = req.query;

    if (!session_token && !msisdn) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token or msisdn required"
      });
    }

    let sessionRes;

    /* 🔍 By session_token */
    if (session_token) {
      sessionRes = await pool.query(
        `
        SELECT *
        FROM pin_sessions
        WHERE session_token = $1
        `,
        [session_token]
      );
    }

    /* 🔍 By msisdn (latest session) */
    else if (msisdn) {
      sessionRes = await pool.query(
        `
        SELECT *
        FROM pin_sessions
        WHERE msisdn = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [msisdn]
      );
    }

    if (!sessionRes.rows.length) {
      return res.json({
        status: "INVALID_SESSION"
      });
    }

    const s = sessionRes.rows[0];

    /* BLOCKED */
    if (s.otp_attempts >= MAX_OTP_ATTEMPTS) {
      return res.json({
        status: "BLOCKED",
        otp_attempts: s.otp_attempts
      });
    }

    /* VERIFIED */
    if (s.status === "VERIFIED") {
      return res.json({
        status: "VERIFIED",
        verified_at: s.verified_at
      });
    }

    /* OTP SENT / INVALID */
    return res.json({
      status: s.status || "OTP_SENT",
      otp_attempts: s.otp_attempts,
      offer_id: s.offer_id
    });

  } catch (err) {
    console.error("CHECK STATUS ERROR:", err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Check status failed"
    });
  }
});

export default router;
