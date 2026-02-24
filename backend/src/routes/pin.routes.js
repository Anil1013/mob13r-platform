// backend/src/routes/pin.routes.js

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

/* =====================================================
   CONFIG
===================================================== */

const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;
const AXIOS_TIMEOUT = 30000;

/* =====================================================
   HELPERS
===================================================== */

function captureHeaders(req) {
  return {
    "user-agent": req.headers["user-agent"] || "",
    "x-forwarded-for": req.headers["x-forwarded-for"] || "",
  };
}

function safeSessionKey(data) {
  return (
    data?.sessionKey ||
    data?.session_key ||
    data?.transactionId ||
    null
  );
}

async function isMsisdnLimitReached(msisdn) {
  const r = await pool.query(
    `SELECT COUNT(*) 
     FROM pin_sessions
     WHERE msisdn=$1
     AND created_at::date=CURRENT_DATE`,
    [msisdn]
  );

  return Number(r.rows[0].count) >= MAX_MSISDN_DAILY;
}

/* =====================================================
   PIN SEND
===================================================== */

router.all("/pin/send/:offer_id", async (req, res) => {
  try {

    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };
    const { msisdn } = incoming;

    if (!msisdn)
      return res.status(400).json({ status: "FAILED" });

    if (await isMsisdnLimitReached(msisdn))
      return res.status(429).json({ status: "BLOCKED" });

    /* ---------- OFFER ---------- */

    const offerRes = await pool.query(
      `SELECT * FROM offers 
       WHERE id=$1 AND status='active'`,
      [offer_id]
    );

    if (!offerRes.rows.length)
      return res.status(404).json({ status: "FAILED" });

    const offer = offerRes.rows[0];

    /* ---------- PARAMETERS ---------- */

    const paramRes = await pool.query(
      `SELECT param_key,param_value
       FROM offer_parameters
       WHERE offer_id=$1`,
      [offer.id]
    );

    const params = {};
    paramRes.rows.forEach(
      p => (params[p.param_key] = p.param_value)
    );

    const advUrl = params.pin_send_url;
    const advMethod =
      (params.method || "GET").toUpperCase();

    const finalParams = {
      ...params,
      ...incoming,
    };

    const sessionToken = uuidv4();

    /* ---------- CREATE SESSION ---------- */

    await pool.query(
      `INSERT INTO pin_sessions
      (offer_id,msisdn,session_token,
       params,publisher_request,status)
      VALUES ($1,$2,$3,$4,$5,'OTP_REQUESTED')`,
      [
        offer.id,
        msisdn,
        sessionToken,
        finalParams,
        {
          url: req.originalUrl,
          method: req.method,
          headers: captureHeaders(req),
          params: incoming,
        },
      ]
    );

    /* ---------- ADVERTISER CALL ---------- */

    let advResp;

    try {
      advResp =
        advMethod === "POST"
          ? await axios.post(
              advUrl,
              finalParams,
              { timeout: AXIOS_TIMEOUT }
            )
          : await axios.get(advUrl, {
              params: finalParams,
              timeout: AXIOS_TIMEOUT,
            });
    } catch (e) {
      advResp = { data: e?.response?.data || null };
    }

    const advData = advResp?.data || {};
    const advMapped =
      mapPinSendResponse(advData);

    const advSessionKey =
      safeSessionKey(advData);

    const publisherResponse =
      mapPublisherResponse({
        ...advMapped.body,
        session_token: sessionToken,
      });

    const finalStatus =
      advMapped.isSuccess
        ? "OTP_SENT"
        : "OTP_FAILED";

    /* ---------- UPDATE SESSION ---------- */

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_request=$1,
           advertiser_response=$2,
           publisher_response=$3,
           adv_session_key=$4,
           status=$5
       WHERE session_token=$6`,
      [
        {
          url: advUrl,
          method: advMethod,
          params:
            advMethod === "GET"
              ? finalParams
              : null,
          body:
            advMethod === "POST"
              ? finalParams
              : null,
        },
        advMapped.body,
        publisherResponse,
        advSessionKey,
        finalStatus,
        sessionToken,
      ]
    );

    return res.json(publisherResponse);

  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res
      .status(500)
      .json({ status: "FAILED" });
  }
});

/* =====================================================
   PIN VERIFY
===================================================== */

router.all("/pin/verify", async (req, res) => {
  try {

    const { session_token, otp } = {
      ...req.query,
      ...req.body,
    };

    if (!session_token || !otp)
      return res.status(400).json({
        status: "FAILED",
      });

    const sRes = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token=$1`,
      [session_token]
    );

    if (!sRes.rows.length)
      return res.json({
        status: "INVALID_SESSION",
      });

    const session = sRes.rows[0];

    if (
      session.otp_attempts >=
      MAX_OTP_ATTEMPTS
    )
      return res
        .status(429)
        .json({ status: "BLOCKED" });

    await pool.query(
      `UPDATE pin_sessions
       SET otp_attempts=
       COALESCE(otp_attempts,0)+1
       WHERE session_token=$1`,
      [session_token]
    );

    /* ---------- VERIFY PARAMS ---------- */

    const paramRes = await pool.query(
      `SELECT param_key,param_value
       FROM offer_parameters
       WHERE offer_id=$1`,
      [session.offer_id]
    );

    const params = {};
    paramRes.rows.forEach(
      p => (params[p.param_key] = p.param_value)
    );

    const verifyUrl =
      params.verify_pin_url;

    const verifyMethod =
      (
        params.verify_method ||
        "GET"
      ).toUpperCase();

    const payload = {
      ...session.params,
      otp,
    };

    if (session.adv_session_key)
      payload.sessionKey =
        session.adv_session_key;

    let advResp;

    try {
      advResp =
        verifyMethod === "POST"
          ? await axios.post(
              verifyUrl,
              payload,
              { timeout: AXIOS_TIMEOUT }
            )
          : await axios.get(verifyUrl, {
              params: payload,
              timeout: AXIOS_TIMEOUT,
            });
    } catch (e) {
      advResp = {
        data: e?.response?.data || null,
      };
    }

    const advMapped =
      mapPinVerifyResponse(
        advResp?.data || {}
      );

    const publisherResponse =
      mapPublisherResponse({
        ...advMapped.body,
        session_token,
      });

    const verifyStatus =
      advMapped.isSuccess
        ? "VERIFIED"
        : "OTP_FAILED";

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_request=$1,
           advertiser_response=$2,
           publisher_response=$3,
           status=$4,
           verified_at=
           CASE WHEN $4='VERIFIED'
           THEN NOW()
           ELSE verified_at END
       WHERE session_token=$5`,
      [
        {
          url: verifyUrl,
          method: verifyMethod,
          params:
            verifyMethod === "GET"
              ? payload
              : null,
          body:
            verifyMethod === "POST"
              ? payload
              : null,
        },
        advMapped.body,
        publisherResponse,
        verifyStatus,
        session_token,
      ]
    );

    return res.json(
      publisherResponse
    );

  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);
    return res
      .status(500)
      .json({ status: "FAILED" });
  }
});

export default router;
