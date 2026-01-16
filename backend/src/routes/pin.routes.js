import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

/* ================= RESPONSE MAPPERS ================= */
import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";

import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;

/* ================= DAILY RESET ================= */
async function resetDailyHits() {
  await pool.query(`
    UPDATE offers
    SET today_hits = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE
  `);
}

/* ================= MSISDN LIMIT ================= */
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

/* ================= ADV METHOD ================= */
function getAdvMethod(params) {
  const m = (params.method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(m)) {
    throw new Error("Invalid advertiser method");
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
    const incoming = { ...req.query, ...req.body };
    const { msisdn } = incoming;

    if (!msisdn) {
      return res.status(400).json({
        status: "FAILED",
        message: "msisdn is required",
      });
    }

    if (await isMsisdnLimitReached(msisdn)) {
      return res.status(429).json({
        status: "BLOCKED",
        message: "MSISDN daily limit reached",
      });
    }

    /* ---------- OFFER ---------- */
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
      return res.status(404).json({
        status: "FAILED",
        message: "Offer not found",
      });
    }

    const offer = offerRes.rows[0];

    /* ---------- OFFER PARAMS ---------- */
    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
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

    const finalParams = {
      ...staticParams,
      ...incoming,
      msisdn,
    };

    const sessionToken = uuidv4();

    /* ================= TRACE: PUBLISHER REQUEST ================= */
    const publisherRequest = {
      url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      method: req.method,
      headers: {
        "User-Agent": req.headers["user-agent"] || "",
        "X-Forwarded-For": req.headers["x-forwarded-for"] || req.ip,
        "X-Publisher-Key": req.headers["x-publisher-key"] || "",
        "Content-Type": "application/json",
      },
      params: req.query || {},
      body: req.body && Object.keys(req.body).length ? req.body : null,
    };

    /* ================= TRACE: ADVERTISER REQUEST ================= */
    const advUrl = new URL(staticParams.pin_send_url);
    Object.entries(finalParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        advUrl.searchParams.append(k, v);
      }
    });

    const advertiserRequest = {
      url: advUrl.toString(),
      method: advMethod,
      headers: {
        "User-Agent": "",
        "X-Forwarded-For": "",
        "Content-Type": "application/json",
      },
      data: advMethod === "POST" ? finalParams : null,
    };

    /* ================= CREATE SESSION ================= */
    await pool.query(
      `
      INSERT INTO pin_sessions
      (offer_id, msisdn, session_token, runtime_params, params, status)
      VALUES ($1,$2,$3,$4,$5,'OTP_SENT')
      `,
      [
        offer.id,
        msisdn,
        sessionToken,
        publisherRequest,     // 🔥 Publisher Req
        advertiserRequest,    // 🔥 Advertiser Req
      ]
    );

    /* ================= CALL ADVERTISER ================= */
    const advResp =
      advMethod === "GET"
        ? await axios.get(staticParams.pin_send_url, { params: finalParams })
        : await axios.post(staticParams.pin_send_url, finalParams);

    const advData = advResp.data;

    /* ================= MAP RESPONSES ================= */
    const advMapped = mapPinSendResponse(advData);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ================= SAVE RESPONSES ================= */
    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_response = $1,
        publisher_response  = $2,
        status              = $3
      WHERE session_token   = $4
      `,
      [
        advData,
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
    return res.status(500).json({
      status: "FAILED",
      message: "PIN send failed",
    });
  }
});

/* =====================================================
   🔐 PIN VERIFY
===================================================== */
async function handlePinVerify(input, res) {
  const { session_token, otp } = input;

  if (!session_token || !otp) {
    return res.status(400).json({
      status: "FAILED",
      message: "session_token & otp required",
    });
  }

  const sRes = await pool.query(
    `SELECT * FROM pin_sessions WHERE session_token = $1`,
    [session_token]
  );

  if (!sRes.rows.length) {
    return res.json({ status: "INVALID_SESSION" });
  }

  const session = sRes.rows[0];

  if (session.otp_attempts >= MAX_OTP_ATTEMPTS) {
    return res.json({ status: "BLOCKED" });
  }

  /* ---------- OFFER ---------- */
  const offerRes = await pool.query(
    `SELECT * FROM offers WHERE id = $1`,
    [session.offer_id]
  );

  const offer = offerRes.rows[0];

  /* ---------- OFFER PARAMS ---------- */
  const paramRes = await pool.query(
    `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
    [offer.id]
  );

  const staticParams = {};
  paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

  const advMethod = getAdvMethod(staticParams);

  const verifyPayload = {
    ...session.params?.data,
    otp,
    sessionKey: session.adv_session_key,
  };

  const advResp =
    advMethod === "GET"
      ? await axios.get(staticParams.verify_pin_url, { params: verifyPayload })
      : await axios.post(staticParams.verify_pin_url, verifyPayload);

  const advData = advResp.data;
  const advMapped = mapPinVerifyResponse(advData);
  const pubMapped = mapPublisherResponse(advMapped.body);

  /* ---------- SAVE VERIFY RESPONSE ---------- */
  await pool.query(
    `
    UPDATE pin_sessions
    SET
      advertiser_response = $1,
      publisher_response  = $2,
      status              = $3,
      otp_attempts        = otp_attempts + 1,
      verified_at         = CASE WHEN $3 = 'SUCCESS' THEN NOW() ELSE verified_at END
    WHERE session_token   = $4
    `,
    [
      advData,
      pubMapped,
      pubMapped.status,
      session.session_token,
    ]
  );

  return res.status(advMapped.httpCode).json(pubMapped);
}

router.post("/pin/verify", async (req, res) => {
  try {
    await handlePinVerify(req.body, res);
  } catch (e) {
    res.status(500).json({ status: "FAILED" });
  }
});

router.get("/pin/verify", async (req, res) => {
  try {
    await handlePinVerify(req.query, res);
  } catch (e) {
    res.status(500).json({ status: "FAILED" });
  }
});

export default router;
