// backend/src/routes/pin.routes.js
// ✅ FULLY CORRECTED & CLEAN VERSION
// ✅ Proper publisher / advertiser request-response mapping
// ✅ Correct URLs for PIN SEND vs PIN VERIFY
// ✅ Dump dashboard friendly (clean structured logs)

import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

/* RESPONSE MAPPERS */
import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";
import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;

/* ================= HELPERS ================= */

function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    ""
  );
}

function getAdvMethod(staticParams) {
  const m = (staticParams.method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(m)) {
    throw new Error("Invalid advertiser method");
  }
  return m;
}

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

    /* LOAD OFFER */
    const offerRes = await pool.query(
      `
      SELECT *
      FROM offers
      WHERE id = $1
        AND status = 'active'
      `,
      [offer_id]
    );

    if (!offerRes.rows.length) {
      return res.status(404).json({ status: "FAILED", message: "Offer not found" });
    }

    const offer = offerRes.rows[0];

    /* LOAD OFFER PARAMS */
    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

    if (!staticParams.pin_send_url) {
      return res.status(500).json({ status: "FAILED", message: "pin_send_url missing" });
    }

    const advMethod = getAdvMethod(staticParams);
    const sessionToken = uuidv4();

    /* ---------------- PUBLISHER REQUEST LOG ---------------- */
    const publisherRequest = {
      url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      method: req.method,
      params: incoming,
      headers: {
        "User-Agent": req.headers["user-agent"] || "",
        "X-Forwarded-For": getClientIP(req),
        "X-Publisher-Key": req.headers["x-publisher-key"] || "",
      },
    };

    /* SAVE SESSION (INITIAL) */
    await pool.query(
      `
      INSERT INTO pin_sessions
      (offer_id, msisdn, session_token, params, status, publisher_request)
      VALUES ($1,$2,$3,$4,'OTP_SENT',$5)
      `,
      [offer.id, msisdn, sessionToken, incoming, publisherRequest]
    );

    /* ---------------- ADVERTISER REQUEST (PIN SEND ONLY) ---------------- */
    const advParams = {
      ...incoming,
      msisdn,
    };

    // ❌ NEVER SEND VERIFY-RELATED DATA IN SEND
    delete advParams.otp;
    delete advParams.sessionKey;

    const advertiserRequest = {
      url: staticParams.pin_send_url,
      method: advMethod,
      params: advMethod === "GET" ? advParams : null,
      body: advMethod === "POST" ? advParams : null,
      headers: {
        "User-Agent": req.headers["user-agent"] || "",
        "X-Forwarded-For": getClientIP(req),
        "Content-Type": "application/json",
      },
    };

    /* HIT ADVERTISER */
    const advResp =
      advMethod === "GET"
        ? await axios.get(staticParams.pin_send_url, { params: advParams })
        : await axios.post(staticParams.pin_send_url, advParams);

    const advData = advResp.data;

    const advMapped = mapPinSendResponse(advData);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* SAVE RESPONSES */
    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_request  = $1,
        advertiser_response = $2,
        publisher_response  = $3,
        status              = $4
      WHERE session_token = $5
      `,
      [
        advertiserRequest,
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
async function handlePinVerify(input, req, res) {
  const { session_token, msisdn, offer_id, otp } = input;

  if (!otp) {
    return res.status(400).json({ status: "FAILED", message: "otp required" });
  }

  let sessionRes;
  if (session_token) {
    sessionRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token = $1`,
      [session_token]
    );
  } else {
    sessionRes = await pool.query(
      `
      SELECT *
      FROM pin_sessions
      WHERE msisdn = $1 AND offer_id = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [msisdn, offer_id]
    );
  }

  if (!sessionRes.rows.length) {
    return res.status(400).json({ status: "FAILED", message: "Invalid session" });
  }

  const session = sessionRes.rows[0];

  if (session.otp_attempts >= MAX_OTP_ATTEMPTS) {
    return res.status(429).json({ status: "BLOCKED" });
  }

  /* LOAD OFFER PARAMS */
  const paramRes = await pool.query(
    `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
    [session.offer_id]
  );

  const staticParams = {};
  paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

  if (!staticParams.verify_pin_url) {
    return res.status(500).json({ status: "FAILED", message: "verify_pin_url missing" });
  }

  const advMethod = getAdvMethod(staticParams);

  const verifyParams = {
    msisdn: session.msisdn,
    otp,
    sessionKey: session.adv_session_key,
  };

  /* ADVERTISER VERIFY REQUEST */
  const advertiserRequest = {
    url: staticParams.verify_pin_url,
    method: advMethod,
    params: advMethod === "GET" ? verifyParams : null,
    body: advMethod === "POST" ? verifyParams : null,
    headers: {
      "User-Agent": req.headers["user-agent"] || "",
      "X-Forwarded-For": getClientIP(req),
      "Content-Type": "application/json",
    },
  };

  const advResp =
    advMethod === "GET"
      ? await axios.get(staticParams.verify_pin_url, { params: verifyParams })
      : await axios.post(staticParams.verify_pin_url, verifyParams);

  const advMapped = mapPinVerifyResponse(advResp.data);
  const pubMapped = mapPublisherResponse(advMapped.body);

  if (advMapped.body.status === "SUCCESS") {
    await pool.query(
      `
      UPDATE pin_sessions
      SET status = 'VERIFIED',
          verified_at = NOW()
      WHERE session_token = $1
      `,
      [session.session_token]
    );
  } else {
    await pool.query(
      `
      UPDATE pin_sessions
      SET otp_attempts = otp_attempts + 1
      WHERE session_token = $1
      `,
      [session.session_token]
    );
  }

  await pool.query(
    `
    UPDATE pin_sessions
    SET advertiser_request = $1,
        advertiser_response = $2,
        publisher_response  = $3,
        status              = $4
    WHERE session_token = $5
    `,
    [
      advertiserRequest,
      advMapped.body,
      pubMapped,
      pubMapped.status,
      session.session_token,
    ]
  );

  return res.status(advMapped.httpCode).json({
    ...pubMapped,
    route: "PRIMARY",
  });
}

/* ROUTES */
router.post("/pin/verify", (req, res) => handlePinVerify(req.body, req, res));
router.get("/pin/verify", (req, res) => handlePinVerify(req.query, req, res));

export default router;
