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
    ip:
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "",
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

/* ===============================
PUBLISHER API KEY CHECK
================================ */

async function validatePublisher(req) {
  const apiKey =
    req.headers["x-api-key"] ||
    req.query["x-api-key"];

  if (!apiKey) return null;

  const r = await pool.query(
    `SELECT * FROM publishers
     WHERE api_key=$1
     AND status='active'
     LIMIT 1`,
    [apiKey]
  );

  return r.rows[0] || null;
}

/* ===============================
MSISDN LIMIT
================================ */

async function isMsisdnLimitReached(msisdn) {
  const r = await pool.query(
    `SELECT COUNT(*) FROM pin_sessions
     WHERE msisdn=$1
     AND created_at::date=CURRENT_DATE`,
    [msisdn]
  );

  return Number(r.rows[0].count) >= MAX_MSISDN_DAILY;
}

/* ===============================
PRIMARY + FALLBACK CALL
================================ */

async function callAdvertiser(
  primaryUrl,
  fallbackUrl,
  method,
  payload
) {
  try {
    const r =
      method === "POST"
        ? await axios.post(primaryUrl, payload, {
            timeout: AXIOS_TIMEOUT,
          })
        : await axios.get(primaryUrl, {
            params: payload,
            timeout: AXIOS_TIMEOUT,
          });

    return {
      source: "PRIMARY",
      data: r.data,
    };
  } catch (e) {
    console.log("PRIMARY FAILED");

    if (!fallbackUrl)
      return {
        source: "PRIMARY_FAILED",
        data:
          e?.response?.data || {},
      };

    const r =
      method === "POST"
        ? await axios.post(
            fallbackUrl,
            payload,
            { timeout: AXIOS_TIMEOUT }
          )
        : await axios.get(
            fallbackUrl,
            {
              params: payload,
              timeout: AXIOS_TIMEOUT,
            }
          );

    return {
      source: "FALLBACK",
      data: r.data,
    };
  }
}

/* =====================================================
PIN SEND
Browser:
.../publisher/pin/send?offer_id=2...
===================================================== */

router.all("/pin/send", async (req, res) => {
  try {
    const publisher =
      await validatePublisher(req);

    if (!publisher)
      return res
        .status(401)
        .json({ status: "INVALID_KEY" });

    const incoming = {
      ...req.query,
      ...req.body,
    };

    const { offer_id, msisdn } =
      incoming;

    if (!offer_id || !msisdn)
      return res.json({
        status: "FAILED",
      });

    if (
      await isMsisdnLimitReached(
        msisdn
      )
    )
      return res
        .status(429)
        .json({
          status: "BLOCKED",
        });

    /* ---------- OFFER PARAMS ---------- */

    const paramRes =
      await pool.query(
        `SELECT param_key,param_value
         FROM offer_parameters
         WHERE offer_id=$1`,
        [offer_id]
      );

    const params = {};
    paramRes.rows.forEach(
      p =>
        (params[p.param_key] =
          p.param_value)
    );

    const advUrl =
      params.pin_send_url;

    const fallbackUrl =
      params.pin_send_fallback_url;

    const method =
      (
        params.method ||
        "GET"
      ).toUpperCase();

    const finalParams = {
      ...params,
      ...incoming,
    };

    const sessionToken =
      uuidv4();

    /* ---------- SESSION CREATE ---------- */

    await pool.query(
      `INSERT INTO pin_sessions
       (offer_id,msisdn,
        session_token,
        params,
        publisher_id,
        publisher_request,
        status)
       VALUES ($1,$2,$3,$4,$5,$6,
       'OTP_REQUESTED')`,
      [
        offer_id,
        msisdn,
        sessionToken,
        finalParams,
        publisher.id,
        {
          url: req.originalUrl,
          headers:
            captureHeaders(req),
          params: incoming,
        },
      ]
    );

    /* ---------- CALL ADV ---------- */

    const advResp =
      await callAdvertiser(
        advUrl,
        fallbackUrl,
        method,
        finalParams
      );

    const advMapped =
      mapPinSendResponse(
        advResp.data
      );

    const advSessionKey =
      safeSessionKey(
        advResp.data
      );

    const publisherResponse =
      mapPublisherResponse({
        ...advMapped.body,
        session_token:
          sessionToken,
      });

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_response=$1,
           adv_session_key=$2,
           status=$3
       WHERE session_token=$4`,
      [
        advMapped.body,
        advSessionKey,
        advMapped.isSuccess
          ? "OTP_SENT"
          : "OTP_FAILED",
        sessionToken,
      ]
    );

    return res.json(
      publisherResponse
    );
  } catch (err) {
    console.error(
      "PIN SEND ERROR:",
      err
    );
    return res
      .status(500)
      .json({
        status: "FAILED",
      });
  }
});

/* =====================================================
PIN VERIFY
===================================================== */

router.all("/pin/verify", async (req, res) => {
  try {
    const publisher =
      await validatePublisher(req);

    if (!publisher)
      return res
        .status(401)
        .json({
          status: "INVALID_KEY",
        });

    const {
      session_token,
      otp,
    } = {
      ...req.query,
      ...req.body,
    };

    if (!session_token || !otp)
      return res.json({
        status: "FAILED",
      });

    const sRes =
      await pool.query(
        `SELECT * FROM pin_sessions
         WHERE session_token=$1`,
        [session_token]
      );

    if (!sRes.rows.length)
      return res.json({
        status:
          "INVALID_SESSION",
      });

    const session =
      sRes.rows[0];

    /* ---------- OFFER PARAMS ---------- */

    const paramRes =
      await pool.query(
        `SELECT param_key,param_value
         FROM offer_parameters
         WHERE offer_id=$1`,
        [session.offer_id]
      );

    const params = {};
    paramRes.rows.forEach(
      p =>
        (params[p.param_key] =
          p.param_value)
    );

    const verifyUrl =
      params.verify_pin_url;

    const fallbackUrl =
      params.verify_fallback_url;

    const method =
      (
        params.verify_method ||
        "GET"
      ).toUpperCase();

    const payload = {
      ...session.params,
      otp,
      sessionKey:
        session.adv_session_key,
    };

    const advResp =
      await callAdvertiser(
        verifyUrl,
        fallbackUrl,
        method,
        payload
      );

    const advMapped =
      mapPinVerifyResponse(
        advResp.data
      );

    const publisherResponse =
      mapPublisherResponse({
        ...advMapped.body,
        session_token,
      });

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_response=$1,
           status=$2,
           verified_at=
           CASE WHEN $2='VERIFIED'
           THEN NOW()
           ELSE verified_at END
       WHERE session_token=$3`,
      [
        advMapped.body,
        advMapped.isSuccess
          ? "VERIFIED"
          : "OTP_FAILED",
        session_token,
      ]
    );

    return res.json(
      publisherResponse
    );
  } catch (err) {
    console.error(
      "VERIFY ERROR:",
      err
    );
    return res
      .status(500)
      .json({
        status: "FAILED",
      });
  }
});

export default router;
