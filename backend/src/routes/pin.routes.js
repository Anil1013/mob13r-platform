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

const AXIOS_TIMEOUT = 30000;

// ✅ TEST MODE
const TEST_MODE = true;
const TEST_OTP = "1234";

/* =====================================================
HELPERS
===================================================== */

function captureHeaders(req) {
  return {
    "user-agent": req.headers["user-agent"] || "",
    "x-forwarded-for":
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      ""
  };
}

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

function resolveTemplate(value, runtime) {
  if (!value || typeof value !== "string") return value;

  return value.replace(/\{(.*?)\}/g, (_, key) => {
    return runtime[key] ?? "";
  });
}

function buildPayload(params, runtime) {
  const payload = {};

  Object.entries(params).forEach(([key, value]) => {
    if (
      key.includes("url") ||
      key.includes("method") ||
      key.includes("fallback")
    ) return;

    payload[key] = resolveTemplate(value, runtime);
  });

  return payload;
}

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
        response: { data: err?.response?.data || {} },
        used: url,
        method
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
        response: { data: err2?.response?.data || {} },
        used: fallback,
        method
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
    if (!publisher)
      return res.status(401).json({ status: "INVALID_KEY" });

    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };

    if (!incoming.msisdn)
      return res.status(400).json({ status: "FAILED" });

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1 AND status='active'`,
      [offer_id]
    );

    if (!offerRes.rows.length)
      return res.status(404).json({ status: "FAILED" });

    const offer = offerRes.rows[0];

    const paramRes = await pool.query(
      `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );

    const params = {};
    paramRes.rows.forEach(p => params[p.param_key] = p.param_value);

    const ua =
      incoming.user_agent ||
      req.headers["user-agent"] ||
      "";

    const runtime = {
      ...incoming,
      ip: incoming.ip || req.ip,
      user_agent: ua,
      publisher_id: publisher.id,
      offer_id: offer.id
    };

    const payload = buildPayload(params, runtime);
    const sessionToken = uuidv4();

    const publisherRequest = {
      url: req.originalUrl,
      method: req.method,
      headers: captureHeaders(req),
      params: incoming
    };

    let advertiserRequest;
    let advertiserResponse;
    let status;

    if (TEST_MODE) {

      advertiserRequest = {
        url: params.pin_send_url,
        method: "GET",
        payload
      };

      advertiserResponse = {
        response: "SUCCESS",
        message: "TEST MODE"
      };

      status = "OTP_SENT";

    } else {

      const advCall = await callAdvertiser(
        params.pin_send_url,
        params.pin_send_fallback_url,
        (params.method || "GET").toUpperCase(),
        payload
      );

      advertiserRequest = {
        url: advCall.used,
        method: advCall.method,
        payload
      };

      advertiserResponse = advCall?.response?.data || {};

      const mapped = mapPinSendResponse(advertiserResponse);
      status = mapped.isSuccess ? "OTP_SENT" : "OTP_FAILED";
    }

    const publisherResponse = mapPublisherResponse({
      status,
      session_token: sessionToken
    });

    await pool.query(
      `INSERT INTO pin_sessions
      (offer_id, msisdn, session_token,
       publisher_request, publisher_response,
       advertiser_request, advertiser_response,
       publisher_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        offer.id,
        incoming.msisdn,
        sessionToken,
        publisherRequest,
        publisherResponse,
        advertiserRequest,
        advertiserResponse,
        publisher.id,
        status
      ]
    );

    return res.json(publisherResponse);

  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    res.status(500).json({ status: "FAILED" });
  }

});

/* =====================================================
PIN VERIFY
===================================================== */

router.all("/pin/verify", async (req, res) => {

  try {

    const publisher = await validatePublisher(req);
    if (!publisher)
      return res.status(401).json({ status: "INVALID_KEY" });

    const { session_token, otp } = {
      ...req.query,
      ...req.body
    };

    if (!session_token || !otp)
      return res.json({ status: "FAILED" });

    const sRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token=$1`,
      [session_token]
    );

    if (!sRes.rows.length)
      return res.json({ status: "INVALID_SESSION" });

    const session = sRes.rows[0];

    const paramRes = await pool.query(
      `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
      [session.offer_id]
    );

    const params = {};
    paramRes.rows.forEach(p => params[p.param_key] = p.param_value);

    const payload = buildPayload(params, {
      ...session.params,
      otp
    });

    const publisherRequest = {
      url: req.originalUrl,
      method: req.method,
      headers: captureHeaders(req),
      params: req.query
    };

    let advertiserRequest;
    let advertiserResponse;
    let status;

    if (TEST_MODE) {

      status = otp === TEST_OTP ? "VERIFIED" : "OTP_FAILED";

      advertiserRequest = {
        url: params.verify_pin_url,
        method: params.verify_method || "GET",
        payload
      };

      advertiserResponse = {
        response: status === "VERIFIED" ? "SUCCESS" : "FAIL",
        errorMessage:
          status === "VERIFIED"
            ? "TEST SUCCESS"
            : "TEST OTP INVALID"
      };

    } else {

      const advCall = await callAdvertiser(
        params.verify_pin_url,
        params.verify_pin_fallback_url,
        (params.verify_method || "GET").toUpperCase(),
        payload
      );

      advertiserRequest = {
        url: advCall.used,
        method: advCall.method,
        payload
      };

      advertiserResponse = advCall?.response?.data || {};

      const mapped = mapPinVerifyResponse(advertiserResponse);
      status = mapped.isSuccess ? "VERIFIED" : "OTP_FAILED";
    }

    const publisherResponse = mapPublisherResponse({
      status,
      session_token
    });

    await pool.query(
      `INSERT INTO pin_sessions
      (offer_id, msisdn, session_token,
       parent_session_token,
       publisher_request, publisher_response,
       advertiser_request, advertiser_response,
       publisher_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        session.offer_id,
        session.msisdn,
        uuidv4(),
        session_token,
        publisherRequest,
        publisherResponse,
        advertiserRequest,
        advertiserResponse,
        session.publisher_id,
        status
      ]
    );

    return res.json(publisherResponse);

  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);
    res.status(500).json({ status: "FAILED" });
  }

});

export default router;
