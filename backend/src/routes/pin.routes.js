import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";

import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;

/* ================= UTILS ================= */
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

function getUserAgent(req) {
  return req.headers["user-agent"] || "";
}

function getAdvMethod(staticParams) {
  const m = (staticParams.method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(m)) {
    throw new Error("Invalid advertiser method");
  }
  return m;
}

/* ================= MSISDN DAILY LIMIT ================= */
async function isMsisdnLimitReached(msisdn) {
  const r = await pool.query(
    `
    SELECT COUNT(*)
    FROM pin_sessions
    WHERE msisdn = $1
      AND created_at::date = CURRENT_DATE
    `,
    [msisdn]
  );
  return Number(r.rows[0].count) >= MAX_MSISDN_DAILY;
}

/* =====================================================
   🔐 PIN SEND
===================================================== */
router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };
    const { msisdn } = incoming;

    if (!msisdn) {
      return res.status(400).json({ status: "FAILED", message: "msisdn required" });
    }

    if (await isMsisdnLimitReached(msisdn)) {
      return res.status(429).json({
        status: "BLOCKED",
        message: "MSISDN daily limit reached",
      });
    }

    /* ---------- OFFER ---------- */
    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1 AND status='active'`,
      [offer_id]
    );
    if (!offerRes.rows.length) {
      return res.status(404).json({ status: "FAILED", message: "Offer not found" });
    }
    const offer = offerRes.rows[0];

    /* ---------- OFFER PARAMS ---------- */
    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

    if (!staticParams.pin_send_url) {
      return res.status(500).json({
        status: "FAILED",
        message: "pin_send_url missing",
      });
    }

    const advMethod = getAdvMethod(staticParams);
    const sessionToken = uuidv4();

    /* ---------- ADVERTISER SENDPIN PARAMS (STRICT) ---------- */
    const advParams = {
      cid: staticParams.cid,
      msisdn,
      pub_id: staticParams.pub_id,
      sub_pub_id: staticParams.sub_pub_id,
      user_ip: incoming.ip || getClientIP(req),
      ua: incoming.ua || getUserAgent(req),
      geo: incoming.geo,
      carrier: incoming.carrier,
    };

    /* ---------- SAVE SESSION ---------- */
    await pool.query(
      `
      INSERT INTO pin_sessions
        (offer_id, msisdn, session_token, params, status)
      VALUES ($1,$2,$3,$4,'OTP_SENT')
      `,
      [offer.id, msisdn, sessionToken, advParams]
    );

    /* ---------- CALL ADVERTISER SENDPIN ---------- */
    const advResp =
      advMethod === "GET"
        ? await axios.get(staticParams.pin_send_url, { params: advParams })
        : await axios.post(staticParams.pin_send_url, advParams);

    const advMapped = mapPinSendResponse(advResp.data);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ---------- STORE RESPONSES ---------- */
    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_request = $1,
        advertiser_response = $2,
        publisher_response  = $3,
        status = $4
      WHERE session_token = $5
      `,
      [
        {
          url: `${staticParams.pin_send_url}`,
          method: advMethod,
          params: advParams,
          headers: { "Content-Type": "application/json" },
        },
        advMapped.body,
        pubMapped,
        pubMapped.status,
        sessionToken,
      ]
    );

    return res.status(advMapped.httpCode).json({
      ...pubMapped,
      offer_id: offer.id,
      session_token: sessionToken,
      route: "PRIMARY",
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   🔐 PIN VERIFY
===================================================== */
router.all("/pin/verify", async (req, res) => {
  try {
    const input = { ...req.query, ...req.body };
    const { session_token, otp } = input;

    if (!session_token || !otp) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token and otp required",
      });
    }

    const sRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token=$1`,
      [session_token]
    );
    if (!sRes.rows.length) {
      return res.status(400).json({ status: "FAILED", message: "Invalid session" });
    }
    const session = sRes.rows[0];

    if (session.otp_attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ status: "BLOCKED" });
    }

    /* ---------- OFFER ---------- */
    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1`,
      [session.offer_id]
    );
    const offer = offerRes.rows[0];

    /* ---------- OFFER PARAMS ---------- */
    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );
    const staticParams = {};
    paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

    if (!staticParams.verify_pin_url) {
      return res.status(500).json({
        status: "FAILED",
        message: "verify_pin_url missing",
      });
    }

    const advMethod = getAdvMethod(staticParams);

    /* ---------- ADVERTISER VERIFYPIN PARAMS ---------- */
    const advVerifyParams = {
      cid: staticParams.cid,
      msisdn: session.msisdn,
      otp,
      pub_id: staticParams.pub_id,
      sub_pub_id: staticParams.sub_pub_id,
      user_ip: input.ip || getClientIP(req),
      ua: input.ua || getUserAgent(req),
    };

    const advResp =
      advMethod === "GET"
        ? await axios.get(staticParams.verify_pin_url, {
            params: advVerifyParams,
          })
        : await axios.post(staticParams.verify_pin_url, advVerifyParams);

    const mapped = mapPinVerifyResponse(advResp.data);

    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_request = $1,
        advertiser_response = $2,
        otp_attempts = otp_attempts + 1,
        status = $3
      WHERE session_token = $4
      `,
      [
        {
          url: staticParams.verify_pin_url,
          method: advMethod,
          params: advVerifyParams,
          headers: { "Content-Type": "application/json" },
        },
        mapped.body,
        mapped.body.status,
        session.session_token,
      ]
    );

    return res.status(mapped.httpCode).json(mapped.body);
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
