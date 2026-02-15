import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  mapPinSendResponse,
  mapPinVerifyResponse
} from "../services/advResponseMapper.js";

import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;

/* ================= HELPER ================= */

function buildUrl(baseUrl, params = {}) {
  const query = new URLSearchParams(params).toString();
  return `${baseUrl}?${query}`;
}

function captureHeaders(req) {
  return {
    "User-Agent": req.headers["user-agent"] || "",
    "Content-Type": "application/json",
    "X-Forwarded-For": req.headers["x-forwarded-for"] || "",
    "X-Publisher-Key": req.headers["x-publisher-key"] || ""
  };
}

function safeSessionKey(advData) {
  return (
    advData?.sessionKey ||
    advData?.session_key ||
    advData?.sessionkey ||
    null
  );
}

/* ================= DAILY RESET ================= */

async function resetDailyHits() {
  await pool.query(`
    UPDATE offers
    SET today_hits = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE
  `);
}

/* ================= LIMIT CHECK ================= */

async function isMsisdnLimitReached(msisdn) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM pin_sessions 
     WHERE msisdn=$1 AND created_at::date=CURRENT_DATE`,
    [msisdn]
  );
  return Number(result.rows[0].count) >= MAX_MSISDN_DAILY;
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
        message: "msisdn required"
      });
    }

    if (await isMsisdnLimitReached(msisdn)) {
      return res.status(429).json({
        status: "BLOCKED",
        message: "MSISDN daily limit reached"
      });
    }

    /* OFFER */
    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1 AND status='active'`,
      [offer_id]
    );

    if (!offerRes.rows.length) {
      return res.status(404).json({ status: "FAILED" });
    }

    const offer = offerRes.rows[0];

    /* OFFER PARAMS */
    const paramRes = await pool.query(
      `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => {
      staticParams[p.param_key] = p.param_value;
    });

    const advUrl = staticParams.pin_send_url;
    const advMethod = (staticParams.method || "GET").toUpperCase();

    const finalParams = {
      ...incoming,
      ...staticParams,
      msisdn
    };

    const sessionToken = uuidv4();

    /* ===== Publisher Request Log ===== */

    const pubReqLog = {
      url: `${req.originalUrl}`,
      body: req.body || {},
      method: req.method,
      params: incoming,
      headers: captureHeaders(req)
    };

    await pool.query(
      `INSERT INTO pin_sessions
       (offer_id,msisdn,session_token,params,publisher_request,status)
       VALUES ($1,$2,$3,$4,$5,'OTP_SENT')`,
      [offer.id, msisdn, sessionToken, finalParams, pubReqLog]
    );

    /* ===== Advertiser Request Log ===== */

    const advRequestLog = {
      url: buildUrl(advUrl, finalParams),
      data: null,
      method: advMethod,
      headers: { "Content-Type": "application/json" }
    };

    await pool.query(
      `UPDATE pin_sessions SET advertiser_request=$1 WHERE session_token=$2`,
      [advRequestLog, sessionToken]
    );

    /* ===== Call Advertiser ===== */

    let advResp;

    try {
      advResp =
        advMethod === "GET"
          ? await axios.get(advUrl, { params: finalParams })
          : await axios.post(advUrl, finalParams);
    } catch (err) {
      advResp = { data: err?.response?.data || null };
    }

    const advData = advResp.data || {};

    /* ===== Save Session Key ===== */

    const advSessionKey = safeSessionKey(advData);

    if (advSessionKey) {
      await pool.query(
        `UPDATE pin_sessions SET adv_session_key=$1 WHERE session_token=$2`,
        [advSessionKey, sessionToken]
      );
    }

    /* ===== Mapping ===== */

    const advMapped = mapPinSendResponse(advData);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ===== Save Response Logs ===== */

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_response=$1,
           publisher_response=$2,
           status=$3
       WHERE session_token=$4`,
      [advMapped.body, pubMapped, pubMapped.status, sessionToken]
    );

    return res.status(advMapped.httpCode).json({
      ...pubMapped,
      session_token: sessionToken,
      offer_id: offer.id
    });

  } catch (err) {
    return res.status(500).json({
      status: "FAILED",
      message: "PIN send failed"
    });
  }
});

/* =====================================================
   🔐 PIN VERIFY
===================================================== */

async function handleVerify(input, req, res) {

  const { session_token, otp } = input;

  if (!session_token || !otp) {
    return res.status(400).json({ status: "FAILED" });
  }

  const sessionRes = await pool.query(
    `SELECT * FROM pin_sessions WHERE session_token=$1`,
    [session_token]
  );

  if (!sessionRes.rows.length) {
    return res.status(400).json({ status: "INVALID_SESSION" });
  }

  const session = sessionRes.rows[0];

  if (!session.adv_session_key) {
    return res.status(400).json({
      status: "FAILED",
      message: "Advertiser sessionKey missing"
    });
  }

  const offerRes = await pool.query(
    `SELECT * FROM offers WHERE id=$1`,
    [session.offer_id]
  );

  const offer = offerRes.rows[0];

  const paramRes = await pool.query(
    `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
    [offer.id]
  );

  const staticParams = {};
  paramRes.rows.forEach(p => {
    staticParams[p.param_key] = p.param_value;
  });

  const verifyUrl = staticParams.verify_pin_url;

  const verifyPayload = {
    ...session.params,
    otp,
    sessionKey: session.adv_session_key
  };

  /* ===== Advertiser Request Log ===== */

  const advReqLog = {
    url: buildUrl(verifyUrl, verifyPayload),
    data: null,
    method: "GET",
    headers: { "Content-Type": "application/json" }
  };

  await pool.query(
    `UPDATE pin_sessions SET advertiser_request=$1 WHERE session_token=$2`,
    [advReqLog, session_token]
  );

  let advResp;

  try {
    advResp = await axios.get(verifyUrl, { params: verifyPayload });
  } catch (err) {
    advResp = { data: err?.response?.data || null };
  }

  const advMapped = mapPinVerifyResponse(advResp.data);
  const pubMapped = mapPublisherResponse(advMapped.body);

  if (pubMapped.status === "SUCCESS") {
    await pool.query(
      `UPDATE pin_sessions SET status='VERIFIED',verified_at=NOW() WHERE session_token=$1`,
      [session_token]
    );
  }

  await pool.query(
    `UPDATE pin_sessions
     SET advertiser_response=$1,
         publisher_response=$2
     WHERE session_token=$3`,
    [advMapped.body, pubMapped, session_token]
  );

  return res.status(advMapped.httpCode).json(pubMapped);
}

/* ROUTES */

router.get("/pin/verify", async (req, res) => {
  await handleVerify(req.query, req, res);
});

router.post("/pin/verify", async (req, res) => {
  await handleVerify(req.body, req, res);
});

export default router;
