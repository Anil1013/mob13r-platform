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
    "x-forwarded-for":
      req.headers["x-forwarded-for"] || "",
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
Publisher API KEY
=============================== */

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
=============================== */

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

/* ===============================
PRIMARY + FALLBACK CALL
=============================== */

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

    return r;
  } catch (err) {
    console.log("PRIMARY FAILED");

    if (!fallbackUrl)
      return {
        data: err?.response?.data || null,
      };

    const r =
      method === "POST"
        ? await axios.post(
            fallbackUrl,
            payload,
            { timeout: AXIOS_TIMEOUT }
          )
        : await axios.get(fallbackUrl, {
            params: payload,
            timeout: AXIOS_TIMEOUT,
          });

    return r;
  }
}

/* =====================================================
PIN SEND
===================================================== */

router.all("/pin/send/:offer_id", async (req, res) => {
  try {

    const publisher =
      await validatePublisher(req);

    if (!publisher)
      return res
        .status(401)
        .json({ status: "INVALID_KEY" });

    const { offer_id } = req.params;
    const incoming = {
      ...req.query,
      ...req.body,
    };

    const { msisdn } = incoming;

    if (!msisdn)
      return res
        .status(400)
        .json({ status: "FAILED" });

    if (
      await isMsisdnLimitReached(msisdn)
    )
      return res
        .status(429)
        .json({ status: "BLOCKED" });

    /* ---------- OFFER ---------- */

    const offerRes =
      await pool.query(
        `SELECT * FROM offers
         WHERE id=$1
         AND status='active'`,
        [offer_id]
      );

    if (!offerRes.rows.length)
      return res
        .status(404)
        .json({ status: "FAILED" });

    const offer =
      offerRes.rows[0];

    /* ---------- PARAMETERS ---------- */

    const paramRes =
      await pool.query(
        `SELECT param_key,param_value
         FROM offer_parameters
         WHERE offer_id=$1`,
        [offer.id]
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

    const advMethod =
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

    /* ---------- CREATE SESSION ---------- */

    await pool.query(
      `INSERT INTO pin_sessions
      (offer_id,msisdn,
       session_token,
       params,
       publisher_request,
       status)
      VALUES ($1,$2,$3,$4,$5,
      'OTP_REQUESTED')`,
      [
        offer.id,
        msisdn,
        sessionToken,
        finalParams,
        {
          url: req.originalUrl,
          method: req.method,
          headers:
            captureHeaders(req),
          params: incoming,
        },
      ]
    );

    /* ---------- ADVERTISER CALL ---------- */

    const advResp =
      await callAdvertiser(
        advUrl,
        fallbackUrl,
        advMethod,
        finalParams
      );

    /* ---------- SAFE MAPPING ---------- */

    let advMapped;

    try {
      if (
        !advResp ||
        !advResp.data ||
        typeof advResp.data !==
          "object"
      ) {
        advMapped = {
          isSuccess: false,
          body: {
            status: "FAILED",
            message:
              "Invalid advertiser response",
          },
        };
      } else {
        advMapped =
          mapPinSendResponse(
            advResp.data
          );
      }
    } catch {
      advMapped = {
        isSuccess: false,
        body: {
          status: "FAILED",
          message:
            "Mapping failed",
        },
      };
    }

    const advSessionKey =
      safeSessionKey(
        advResp?.data
      );

    const publisherResponse =
      mapPublisherResponse({
        ...advMapped.body,
        session_token:
          sessionToken,
      });

    const finalStatus =
      advMapped.isSuccess
        ? "OTP_SENT"
        : "OTP_FAILED";

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_response=$1,
           publisher_response=$2,
           adv_session_key=$3,
           status=$4
       WHERE session_token=$5`,
      [
        advMapped.body,
        publisherResponse,
        advSessionKey,
        finalStatus,
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

    const advResp =
      await callAdvertiser(
        verifyUrl,
        fallbackUrl,
        verifyMethod,
        payload
      );

    let advMapped;

    try {
      if (
        !advResp ||
        !advResp.data ||
        typeof advResp.data !==
          "object"
      ) {
        advMapped = {
          isSuccess: false,
          body: {
            status: "FAILED",
          },
        };
      } else {
        advMapped =
          mapPinVerifyResponse(
            advResp.data
          );
      }
    } catch {
      advMapped = {
        isSuccess: false,
        body: {
          status: "FAILED",
        },
      };
    }

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
       SET advertiser_response=$1,
           publisher_response=$2,
           status=$3,
           verified_at=
           CASE WHEN $3='VERIFIED'
           THEN NOW()
           ELSE verified_at END
       WHERE session_token=$4`,
      [
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
    console.error(
      "PIN VERIFY ERROR:",
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
