import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

/**
 * 🔐 PIN SEND (GET + POST)
 * URL:
 *  GET  /api/pin/send/:offer_id
 *  POST /api/pin/send/:offer_id
 */
router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    const { offer_id } = req.params;

    // Merge GET + POST params
    const incomingParams = {
      ...req.query,
      ...req.body,
    };

    const msisdn = incomingParams.msisdn;
    if (!msisdn) {
      return res.status(400).json({ message: "msisdn is required" });
    }

    /* 1️⃣ Load Offer */
    const offerResult = await pool.query(
      "SELECT * FROM offers WHERE id = $1 AND status = 'active'",
      [offer_id]
    );

    if (!offerResult.rows.length) {
      return res.status(404).json({ message: "Offer not found or inactive" });
    }

    const offer = offerResult.rows[0];

    /* 2️⃣ Load Static Parameters */
    const paramResult = await pool.query(
      "SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1",
      [offer_id]
    );

    let staticParams = {};
    paramResult.rows.forEach((p) => {
      staticParams[p.param_key] = p.param_value;
    });

    /* 3️⃣ Merge Params (Incoming > Static) */
    const finalParams = {
      ...staticParams,
      ...incomingParams,
      msisdn,
    };

    /* 4️⃣ Create PIN Session */
    const sessionToken = uuidv4();

    await pool.query(
      `INSERT INTO pin_sessions
       (offer_id, msisdn, session_token, params, status)
       VALUES ($1, $2, $3, $4, 'OTP_SENT')`,
      [offer_id, msisdn, sessionToken, finalParams]
    );

    /* 5️⃣ Call OPERATOR PIN SEND */
    // NOTE: operator URLs should be stored in offer_parameters or offers table
    const pinSendUrl =
      staticParams.pin_send_url || staticParams.operator_send_url;

    if (!pinSendUrl) {
      return res
        .status(500)
        .json({ message: "PIN send URL not configured for offer" });
    }

    const method = staticParams.request_method || "POST";

    if (method === "GET") {
      await axios.get(pinSendUrl, { params: finalParams });
    } else {
      await axios.post(pinSendUrl, finalParams);
    }

    /* 6️⃣ Response */
    return res.json({
      status: "OTP_SENT",
      session_token: sessionToken,
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err.message);
    return res.status(500).json({ message: "PIN send failed" });
  }
});

/**
 * 🔐 PIN VERIFY
 * URL:
 *  POST /api/pin/verify
 */
router.post("/pin/verify", async (req, res) => {
  try {
    const { session_token, otp } = req.body;

    if (!session_token || !otp) {
      return res.status(400).json({
        message: "session_token and otp are required",
      });
    }

    /* 1️⃣ Load Session */
    const sessionResult = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token = $1 AND status = 'OTP_SENT'`,
      [session_token]
    );

    if (!sessionResult.rows.length) {
      return res.status(400).json({ message: "Invalid or expired session" });
    }

    const session = sessionResult.rows[0];

    /* 2️⃣ Load Offer */
    const offerResult = await pool.query(
      "SELECT * FROM offers WHERE id = $1",
      [session.offer_id]
    );

    const offer = offerResult.rows[0];

    /* 3️⃣ Prepare VERIFY Params */
    const verifyParams = {
      ...session.params,
      otp,
    };

    /* 4️⃣ Load Static Params again (for verify URL) */
    const paramResult = await pool.query(
      "SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1",
      [session.offer_id]
    );

    let staticParams = {};
    paramResult.rows.forEach((p) => {
      staticParams[p.param_key] = p.param_value;
    });

    const pinVerifyUrl =
      staticParams.pin_verify_url || staticParams.operator_verify_url;

    if (!pinVerifyUrl) {
      return res
        .status(500)
        .json({ message: "PIN verify URL not configured for offer" });
    }

    const method = staticParams.request_method || "POST";

    /* 5️⃣ Call OPERATOR PIN VERIFY */
    if (method === "GET") {
      await axios.get(pinVerifyUrl, { params: verifyParams });
    } else {
      await axios.post(pinVerifyUrl, verifyParams);
    }

    /* 6️⃣ Update Session */
    await pool.query(
      `UPDATE pin_sessions
       SET status = 'VERIFIED', verified_at = NOW()
       WHERE id = $1`,
      [session.id]
    );

    return res.json({
      status: "SUCCESS",
    });
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err.message);
    return res.status(500).json({ message: "PIN verify failed" });
  }
});

export default router;
