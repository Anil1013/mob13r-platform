import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

/* 🔎 DAILY CAP CHECK (ONLY) */
async function isDailyCapReached(offerId, dailyCap) {
  if (!dailyCap) return false;

  const result = await pool.query(
    `SELECT COUNT(*) FROM pin_sessions
     WHERE offer_id=$1
     AND created_at::date = CURRENT_DATE`,
    [offerId]
  );

  return Number(result.rows[0].count) >= dailyCap;
}

/* 🔁 FIND FALLBACK (SAME GEO + CARRIER) */
async function findFallbackOffer(primaryOffer) {
  const fallback = await pool.query(
    `SELECT * FROM offers
     WHERE advertiser_id=$1
     AND geo=$2
     AND carrier=$3
     AND is_fallback=true
     AND status='active'
     LIMIT 1`,
    [
      primaryOffer.advertiser_id,
      primaryOffer.geo,
      primaryOffer.carrier,
    ]
  );

  return fallback.rows[0] || null;
}

/**
 * 🔐 PIN SEND (GET + POST)
 */
router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    const { offer_id } = req.params;

    const incomingParams = {
      ...req.query,
      ...req.body,
    };

    const msisdn = incomingParams.msisdn;
    if (!msisdn) {
      return res.status(400).json({ message: "msisdn is required" });
    }

    /* 1️⃣ LOAD PRIMARY OFFER */
    const offerResult = await pool.query(
      "SELECT * FROM offers WHERE id=$1 AND status='active'",
      [offer_id]
    );

    if (!offerResult.rows.length) {
      return res.status(404).json({ message: "Offer not found" });
    }

    let selectedOffer = offerResult.rows[0];
    let routed = "PRIMARY";

    /* 2️⃣ CHECK DAILY CAP */
    const capHit = await isDailyCapReached(
      selectedOffer.id,
      selectedOffer.daily_cap
    );

    if (capHit) {
      const fallback = await findFallbackOffer(selectedOffer);
      if (!fallback) {
        return res
          .status(429)
          .json({ message: "Daily cap reached, no fallback available" });
      }
      selectedOffer = fallback;
      routed = "FALLBACK";
    }

    /* 3️⃣ LOAD STATIC PARAMS */
    const paramResult = await pool.query(
      "SELECT param_key, param_value FROM offer_parameters WHERE offer_id=$1",
      [selectedOffer.id]
    );

    let staticParams = {};
    paramResult.rows.forEach((p) => {
      staticParams[p.param_key] = p.param_value;
    });

    /* 4️⃣ FINAL PARAMS */
    const finalParams = {
      ...staticParams,
      ...incomingParams,
      msisdn,
    };

    const sessionToken = uuidv4();

    await pool.query(
      `INSERT INTO pin_sessions
       (offer_id, msisdn, session_token, params, status)
       VALUES ($1,$2,$3,$4,'OTP_SENT')`,
      [selectedOffer.id, msisdn, sessionToken, finalParams]
    );

    /* 5️⃣ OPERATOR PIN SEND */
    const pinSendUrl =
      staticParams.pin_send_url || staticParams.operator_send_url;

    if (!pinSendUrl) {
      return res
        .status(500)
        .json({ message: "PIN send URL not configured" });
    }

    const method = staticParams.request_method || "POST";

    try {
      if (method === "GET") {
        await axios.get(pinSendUrl, { params: finalParams });
      } else {
        await axios.post(pinSendUrl, finalParams);
      }
    } catch (err) {
      /* 🔁 PRIMARY FAIL → FALLBACK TRY */
      if (routed === "PRIMARY") {
        const fallback = await findFallbackOffer(selectedOffer);
        if (!fallback) throw err;

        selectedOffer = fallback;
        routed = "FALLBACK";

        await pool.query(
          `UPDATE pin_sessions
           SET offer_id=$1
           WHERE session_token=$2`,
          [fallback.id, sessionToken]
        );

        await axios.post(
          staticParams.pin_send_url,
          finalParams
        );
      } else {
        throw err;
      }
    }

    return res.json({
      status: "OTP_SENT",
      session_token: sessionToken,
      routed_offer: routed,
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err.message);
    return res.status(500).json({ message: "PIN send failed" });
  }
});

/**
 * 🔐 PIN VERIFY
 */
router.post("/pin/verify", async (req, res) => {
  try {
    const { session_token, otp } = req.body;

    if (!session_token || !otp) {
      return res.status(400).json({
        message: "session_token and otp are required",
      });
    }

    /* 1️⃣ LOAD SESSION */
    const sessionResult = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token=$1 AND status='OTP_SENT'`,
      [session_token]
    );

    if (!sessionResult.rows.length) {
      return res.status(400).json({ message: "Invalid session" });
    }

    const session = sessionResult.rows[0];

    /* 2️⃣ LOAD OFFER */
    const offerResult = await pool.query(
      "SELECT * FROM offers WHERE id=$1",
      [session.offer_id]
    );
    const offer = offerResult.rows[0];

    /* 3️⃣ LOAD STATIC PARAMS */
    const paramResult = await pool.query(
      "SELECT param_key, param_value FROM offer_parameters WHERE offer_id=$1",
      [offer.id]
    );

    let staticParams = {};
    paramResult.rows.forEach((p) => {
      staticParams[p.param_key] = p.param_value;
    });

    const verifyParams = {
      ...session.params,
      otp,
    };

    const pinVerifyUrl =
      staticParams.pin_verify_url || staticParams.operator_verify_url;

    const method = staticParams.request_method || "POST";

    if (method === "GET") {
      await axios.get(pinVerifyUrl, { params: verifyParams });
    } else {
      await axios.post(pinVerifyUrl, verifyParams);
    }

    await pool.query(
      `UPDATE pin_sessions
       SET status='VERIFIED', verified_at=NOW()
       WHERE id=$1`,
      [session.id]
    );

    return res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err.message);
    return res.status(500).json({ message: "PIN verify failed" });
  }
});

export default router;
