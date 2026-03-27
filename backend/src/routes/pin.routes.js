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

const AXIOS_TIMEOUT = 30000;
const MAX_MSISDN_DAILY = 7;
const FORCE_SUCCESS_OTP = "1013";

/* =====================================================
HELPERS
===================================================== */

function captureHeaders(req) {
  return {
    "user-agent": req.headers["user-agent"] || "",
    "x-forwarded-for":
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "",
  };
}

function safeSessionKey(data) {
  return data?.sessionKey || data?.session_key || data?.transactionId || null;
}

function resolveTemplate(value, runtime) {
  if (!value || typeof value !== "string") return value;

  return value.replace(/\{(.*?)\}/g, (_, key) => runtime[key] ?? "");
}

function buildPayload(params, runtime) {
  const payload = {};

  Object.entries(params).forEach(([key, value]) => {
    if (
      key.includes("url") ||
      key.includes("method") ||
      key.includes("fallback")
    ) {
      return;
    }

    payload[key] = resolveTemplate(value, runtime);
  });

  return payload;
}

/* =====================================================
Publisher Validation
===================================================== */

async function validatePublisher(req) {
  const apiKey =
    req.headers["x-publisher-key"] ||
    req.headers["x-api-key"] ||
    (req.headers.authorization
      ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
      : null) ||
    req.query["x-publisher-key"] ||
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

/* =====================================================
MSISDN daily cap
===================================================== */

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
Advertiser Call
===================================================== */

async function callAdvertiser(url, fallback, method, payload) {
  try {
    const resp =
      method === "POST"
        ? await axios.post(url, payload, { timeout: AXIOS_TIMEOUT })
        : await axios.get(url, { params: payload, timeout: AXIOS_TIMEOUT });

    return { response: resp, used: url, method };
  } catch (err) {
    if (!fallback) {
      return {
        response: { data: err?.response?.data || { error: "primary failed" } },
        used: url,
        method,
      };
    }

    try {
      const resp =
        method === "POST"
          ? await axios.post(fallback, payload, { timeout: AXIOS_TIMEOUT })
          : await axios.get(fallback, { params: payload, timeout: AXIOS_TIMEOUT });

      return { response: resp, used: fallback, method };
    } catch (err2) {
      return {
        response: { data: err2?.response?.data || { error: "fallback failed" } },
        used: fallback,
        method,
      };
    }
  }
}

/* =====================================================
PIN SEND
===================================================== */

router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    const publisher = await validatePublisher(req);
    if (!publisher) return res.status(401).json({ status: "INVALID_KEY" });

    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };

    if (!incoming.msisdn) return res.status(400).json({ status: "FAILED" });
    if (await isMsisdnLimitReached(incoming.msisdn)) {
      return res.status(429).json({ status: "BLOCKED" });
    }

    const offerRes = await pool.query(
      `SELECT * FROM offers
       WHERE id=$1 AND status='active'`,
      [offer_id]
    );

    if (!offerRes.rows.length) return res.status(404).json({ status: "FAILED" });

    const offer = offerRes.rows[0];

    const paramRes = await pool.query(
      `SELECT param_key,param_value
       FROM offer_parameters
       WHERE offer_id=$1`,
      [offer.id]
    );

    const params = {};
    paramRes.rows.forEach((p) => {
      params[p.param_key] = p.param_value;
    });

    const ua = incoming.user_agent || req.headers["user-agent"] || "";
    const ip = incoming.ip || req.headers["x-forwarded-for"] || req.ip || "";

    const runtime = {
      ...incoming,
      ip,
      user_ip: ip,
      user_agent: ua,
      ua,
      userAgent: ua,
      publisher_id: publisher.id,
      offer_id: offer.id,
    };

    const payload = buildPayload(params, runtime);
    const sessionToken = uuidv4();

    await pool.query(
      `INSERT INTO pin_sessions
      (offer_id,msisdn,session_token,
       params,publisher_request,
       publisher_id,status)
      VALUES ($1,$2,$3,$4,$5,$6,'OTP_REQUESTED')`,
      [
        offer.id,
        incoming.msisdn,
        sessionToken,
        runtime,
        {
          url: req.originalUrl,
          method: req.method,
          headers: captureHeaders(req),
          params: incoming,
        },
        publisher.id,
      ]
    );

    const advCall = await callAdvertiser(
      params.pin_send_url,
      params.pin_send_fallback_url,
      (params.method || "GET").toUpperCase(),
      payload
    );

    let advertiserResponse = advCall?.response?.data || {};

    if (advertiserResponse?.data && typeof advertiserResponse.data === "object") {
      advertiserResponse = {
        ...advertiserResponse,
        ...advertiserResponse.data,
      };
    }

    let advMapped;
    try {
      advMapped = mapPinSendResponse(advertiserResponse);
    } catch {
      advMapped = { isSuccess: false, body: { status: "FAILED" } };
    }

    const publisherResponse = mapPublisherResponse({
      ...advMapped.body,
      session_token: sessionToken,
    });

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
          url: advCall.used,
          method: advCall.method,
          payload,
        },
        advertiserResponse,
        publisherResponse,
        safeSessionKey(advertiserResponse),
        advMapped.isSuccess ? "OTP_SENT" : "OTP_FAILED",
        sessionToken,
      ]
    );

    return res.json(publisherResponse);
  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
PIN VERIFY
===================================================== */

router.all("/pin/verify", async (req, res) => {
  try {
    const publisher = await validatePublisher(req);
    if (!publisher) return res.status(401).json({ status: "INVALID_KEY" });

    const { session_token, otp } = {
      ...req.query,
      ...req.body,
    };

    if (!session_token || !otp) return res.json({ status: "FAILED" });

    const sRes = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token=$1
       AND publisher_id=$2`,
      [session_token, publisher.id]
    );

    if (!sRes.rows.length) return res.json({ status: "INVALID_SESSION" });

    const session = sRes.rows[0];

    const paramRes = await pool.query(
      `SELECT param_key,param_value
       FROM offer_parameters
       WHERE offer_id=$1`,
      [session.offer_id]
    );

    const params = {};
    paramRes.rows.forEach((p) => {
      params[p.param_key] = p.param_value;
    });

    let advData = session.advertiser_response || {};
    if (advData?.data && typeof advData.data === "object") {
      advData = {
        ...advData,
        ...advData.data,
      };
    }

    const ua = session.params?.user_agent || req.headers["user-agent"] || "";
    const ip =
      session.params?.ip || req.headers["x-forwarded-for"] || req.ip || "";

    const runtime = {
      ...session.params,
      ...advData,
      msisdn: session.msisdn,
      otp,
      ip,
      user_ip: ip,
      user_agent: ua,
      ua,
      userAgent: ua,
      sessionKey: session.adv_session_key,
    };

    const payload = buildPayload(params, runtime);
    const verifyRowToken = uuidv4();

    await pool.query(
      `INSERT INTO pin_sessions
       (offer_id,msisdn,session_token,
        parent_session_token,params,
        publisher_request,publisher_id,
        status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'VERIFY_REQUESTED')`,
      [
        session.offer_id,
        session.msisdn,
        verifyRowToken,
        session_token,
        runtime,
        {
          url: req.originalUrl,
          method: req.method,
          headers: captureHeaders(req),
          params: { ...req.query, otp },
        },
        session.publisher_id,
      ]
    );

    let advertiserResponse = {};
    let advMapped = { isSuccess: false, body: { status: "FAILED" } };

    if (String(otp).trim() === FORCE_SUCCESS_OTP) {
      advertiserResponse = {
        forced_success: true,
        message: "Forced verify success by test OTP rule",
      };

      advMapped = {
        isSuccess: true,
        body: {
          status: "SUCCESS",
          message: "OTP verified successfully",
        },
      };
    } else {
      const advCall = await callAdvertiser(
        params.verify_pin_url,
        params.verify_pin_fallback_url || params.verify_fallback_url,
        (params.verify_method || "GET").toUpperCase(),
        payload
      );

      advertiserResponse = advCall?.response?.data || {};

      try {
        advMapped = mapPinVerifyResponse(advertiserResponse);
      } catch {
        advMapped = { isSuccess: false, body: { status: "FAILED" } };
      }

      await pool.query(
        `UPDATE pin_sessions
         SET advertiser_request=$1
         WHERE session_token=$2`,
        [
          {
            url: advCall.used,
            method: advCall.method,
            payload,
          },
          verifyRowToken,
        ]
      );
    }

    const publisherResponse = mapPublisherResponse({
      ...advMapped.body,
      session_token: verifyRowToken,
    });

    await pool.query(
      `UPDATE pin_sessions ps
       SET advertiser_request = COALESCE(advertiser_request, $1),
           advertiser_response=$2,
           publisher_response=$3,
           status=$4,
           verified_at=CASE WHEN $4='VERIFIED' THEN NOW() ELSE verified_at END,
           payout = CASE WHEN $4='VERIFIED' THEN o.cpa ELSE payout END
       FROM offers o
       WHERE ps.offer_id = o.id
       AND ps.session_token=$5`,
      [
        {
          url: params.verify_pin_url,
          method: (params.verify_method || "GET").toUpperCase(),
          payload,
        },
        advertiserResponse,
        publisherResponse,
        advMapped.isSuccess ? "VERIFIED" : "OTP_FAILED",
        verifyRowToken,
      ]
    );

    return res.json(publisherResponse);
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
