import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  mapPinSendResponse,
  mapPinVerifyResponse
} from "../services/advResponseMapper.js";

import { mapPublisherResponse } from "../services/pubResponseMapper.js";

import { encodeHeadersB64, resolveWorkflowUrl, executeWorkflowSteps } from "../services/antifraudService.js";

const router = express.Router();

const AXIOS_TIMEOUT = 30000;

/* =====================================================
   HELPERS
===================================================== */

function captureHeaders(req) {
  return {
    "user-agent": req.headers["user-agent"] || "",
    "x-forwarded-for": req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""
  };
}

/* =====================================================
   Publisher Validation
===================================================== */

async function validatePublisher(req) {
  const apiKey = req.headers["x-api-key"] || req.query["x-api-key"];
  if (!apiKey) return null;
  const r = await pool.query(
    `SELECT * FROM publishers WHERE api_key=$1 AND status='active' LIMIT 1`,
    [apiKey]
  );
  return r.rows[0] || null;
}

/* =====================================================
   Template Resolver — {placeholder} → actual value
===================================================== */

function resolveTemplate(value, runtime) {
  if (!value) return value;
  if (typeof value !== "string") return value;
  return value.replace(/\{(.*?)\}/g, (_, key) => runtime[key] ?? "");
}

/* =====================================================
   Build Advertiser Payload
   Only ACTIVE parameters (is_active = true) pass honge
===================================================== */

function buildPayload(params, runtime, skipOtp = false) {
  const payload = {};
  params.forEach(({ param_key, param_value, is_active }) => {
    // Skip inactive params
    if (!is_active) return;
    // Skip URL/method/fallback keys
    if (
      param_key.includes("url") ||
      param_key.includes("method") ||
      param_key.includes("fallback")
    ) return;
    // pin_send mein otp/pin skip karo
    if (skipOtp && (param_key === "otp" || param_key === "pin")) return;
    payload[param_key] = resolveTemplate(param_value, runtime);
  });
  return payload;
}

/* =====================================================
   Get param value by key from param rows
===================================================== */

function getParam(params, key) {
  const row = params.find(p => p.param_key === key);
  return row ? row.param_value : "";
}

/* =====================================================
   Advertiser Call with fallback
===================================================== */

async function callAdvertiser(url, fallbackUrl, method, payload) {
  const doCall = async (targetUrl) => {
    return method === "POST"
      ? await axios.post(targetUrl, payload, { timeout: AXIOS_TIMEOUT })
      : await axios.get(targetUrl, { params: payload, timeout: AXIOS_TIMEOUT });
  };

  // Try primary URL
  try {
    const resp = await doCall(url);
    return { response: resp, used: url, method, usedFallback: false };
  } catch (err) {
    console.warn(`⚠️ Primary URL failed: ${url} — ${err.message}`);

    // Try fallback URL if available
    if (fallbackUrl) {
      try {
        const resp = await doCall(fallbackUrl);
        console.log(`✅ Fallback URL succeeded: ${fallbackUrl}`);
        return { response: resp, used: fallbackUrl, method, usedFallback: true };
      } catch (err2) {
        console.error(`❌ Fallback URL also failed: ${fallbackUrl} — ${err2.message}`);
        return {
          response: { data: err2?.response?.data || {} },
          used: fallbackUrl,
          method,
          usedFallback: true
        };
      }
    }

    return {
      response: { data: err?.response?.data || {} },
      used: url,
      method,
      usedFallback: false
    };
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

    if (!incoming.msisdn) return res.status(400).json({ status: "FAILED", message: "msisdn required" });

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1 AND status='active'`,
      [offer_id]
    );
    if (!offerRes.rows.length) return res.status(404).json({ status: "FAILED", message: "Offer not found" });

    const offer = offerRes.rows[0];

    // Fetch ALL params (active + inactive) — we need URL/method from all
    const paramRes = await pool.query(
      `SELECT param_key, param_value, is_active FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );
    const allParams = paramRes.rows;

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
      headers_b64: encodeHeadersB64(req.headers)
    };

    // Antifraud/Status workflow
    const workflow = await executeWorkflowSteps(offer, runtime);
    if (workflow.block) return res.json({ status: "ALREADY_SUBSCRIBED" });

    runtime.af_id = workflow.afId;
    let injectedScript = workflow.injectedScript;

    // Build payload — only is_active=true params
    const sessionToken = uuidv4();
    runtime.session_token = sessionToken;

    const payload = buildPayload(allParams, runtime, true); // pin_send: skip otp/pin

    await pool.query(
      `INSERT INTO pin_sessions (offer_id,msisdn,session_token,params,publisher_request,publisher_id,status)
       VALUES ($1,$2,$3,$4,$5,$6,'OTP_REQUESTED')`,
      [
        offer.id, incoming.msisdn, sessionToken, runtime,
        { url: req.originalUrl, method: req.method, headers: captureHeaders(req), params: incoming },
        publisher.id
      ]
    );

    // Resolve send URL — offer table > params (resolve placeholders in URL too)
    const rawSendUrl = offer.pin_send_url || getParam(allParams, "pin_send_url");
    const resolvedSendUrl = resolveTemplate(rawSendUrl, runtime);

    const rawFallbackUrl = getParam(allParams, "pin_send_fallback_url");
    const resolvedFallbackUrl = resolveTemplate(rawFallbackUrl, runtime);

    const method = (getParam(allParams, "method") || "GET").toUpperCase();

    console.log(`📤 PIN SEND → ${resolvedSendUrl}`);
    console.log(`📦 Payload:`, payload);

    const advCall = await callAdvertiser(resolvedSendUrl, resolvedFallbackUrl || null, method, payload);

    let advertiserResponse = advCall?.response?.data || {};
    if (advertiserResponse?.data && typeof advertiserResponse.data === "object") {
      advertiserResponse = { ...advertiserResponse, ...advertiserResponse.data };
    }

    if (offer.af_trigger_point === "AFTER_SEND" || advertiserResponse.js) {
      injectedScript = advertiserResponse.js || injectedScript;
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
      js_script: injectedScript
    });

    await pool.query(
      `UPDATE pin_sessions SET advertiser_request=$1, advertiser_response=$2, publisher_response=$3, status=$4
       WHERE session_token=$5`,
      [
        { url: advCall.used, method: advCall.method, payload, used_fallback: advCall.usedFallback },
        advertiserResponse,
        publisherResponse,
        advMapped.isSuccess ? "OTP_SENT" : "OTP_FAILED",
        sessionToken
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

    const { session_token, otp } = { ...req.query, ...req.body };
    if (!session_token || !otp) return res.json({ status: "FAILED", message: "session_token and otp required" });

    const sRes = await pool.query(`SELECT * FROM pin_sessions WHERE session_token=$1`, [session_token]);
    if (!sRes.rows.length) return res.json({ status: "INVALID_SESSION" });

    const session = sRes.rows[0];

    // Fetch ALL params
    const paramRes = await pool.query(
      `SELECT param_key, param_value, is_active FROM offer_parameters WHERE offer_id=$1`,
      [session.offer_id]
    );
    const allParams = paramRes.rows;

    let advData = session.advertiser_response || {};
    if (advData?.data && typeof advData.data === "object") {
      advData = { ...advData, ...advData.data };
    }

    const ua = session.params?.user_agent || req.headers["user-agent"] || "";
    const ip = session.params?.ip || req.headers["x-forwarded-for"] || req.ip || "";

    const runtime = {
      ...session.params,
      ...advData,
      msisdn: session.msisdn,
      otp,
      pin: otp,
      ip,
      user_ip: ip,
      user_agent: ua,
      ua,
      userAgent: ua
    };

    // Build payload — only is_active=true params
    const payload = buildPayload(allParams, runtime, true); // pin_send: skip otp/pin

    const verifyRowToken = uuidv4();

    await pool.query(
      `INSERT INTO pin_sessions (offer_id,msisdn,session_token,parent_session_token,params,publisher_request,publisher_id,publisher_offer_id,publisher_cpa,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'VERIFY_REQUESTED')`,
      [
        session.offer_id, session.msisdn, verifyRowToken, session_token, runtime,
        { url: req.originalUrl, method: req.method, headers: captureHeaders(req), params: { ...req.query, otp } },
        session.publisher_id, session.publisher_offer_id, session.publisher_cpa
      ]
    );

    const offerRes = await pool.query(`SELECT * FROM offers WHERE id=$1`, [session.offer_id]);
    const offer = offerRes.rows[0];

    // Resolve verify URL — offer table > params
    const rawVerifyUrl = offer.pin_verify_url || getParam(allParams, "verify_pin_url");
    const resolvedVerifyUrl = resolveTemplate(rawVerifyUrl, runtime);

    const rawVerifyFallback = getParam(allParams, "verify_pin_fallback_url");
    const resolvedVerifyFallback = resolveTemplate(rawVerifyFallback, runtime);

    const verifyMethod = (getParam(allParams, "verify_method") || "GET").toUpperCase();

    console.log(`📤 PIN VERIFY → ${resolvedVerifyUrl}`);
    console.log(`📦 Payload:`, payload);

    const advCall = await callAdvertiser(resolvedVerifyUrl, resolvedVerifyFallback || null, verifyMethod, payload);

    let advertiserResponse = advCall?.response?.data || {};
    let advMapped;

    // Magic OTP override (testing)
    if (otp === "1013") {
      advMapped = { isSuccess: true, body: { status: "SUCCESS" } };
    } else {
      try {
        advMapped = mapPinVerifyResponse(advertiserResponse);
      } catch {
        advMapped = { isSuccess: false, body: { status: "FAILED" } };
      }
    }

    let finalStatus = advMapped.isSuccess ? "VERIFIED" : "OTP_FAILED";

    // Monthly conversion limit check
    if (advMapped.isSuccess && publisher && publisher.org_id) {
      const orgLimitRes = await pool.query(
        `SELECT monthly_conversions FROM organizations WHERE id=$1`,
        [publisher.org_id]
      );
      if (orgLimitRes.rows.length > 0) {
        const monthCountRes = await pool.query(
          `SELECT COUNT(*)::int AS count FROM pin_sessions
           WHERE org_id=$1 AND status IN ('VERIFIED','SCRUBBED','CAP_REACHED')
           AND parent_session_token IS NOT NULL
           AND created_at >= date_trunc('month', NOW())`,
          [publisher.org_id]
        );
        if (monthCountRes.rows[0].count >= orgLimitRes.rows[0].monthly_conversions) {
          finalStatus = "CAP_REACHED";
          advMapped.isSuccess = false;
        }
      }
    }

    let isCredited = false;
    let creditedAt = null;
    let triggerHold = false;
    let triggerCap = false;

    if (advMapped.isSuccess) {
      const ruleRes = await pool.query(
        `SELECT daily_cap, pass_percent FROM publisher_offers
         WHERE publisher_id=$1 AND offer_id=$2 AND status='active'`,
        [session.publisher_id, session.offer_id]
      );

      if (ruleRes.rows.length > 0) {
        const { daily_cap, pass_percent } = ruleRes.rows[0];
        const creditedRes = await pool.query(
          `SELECT COUNT(*)::int FROM pin_sessions
           WHERE publisher_id=$1 AND offer_id=$2
           AND publisher_credited=TRUE AND credited_at::date=CURRENT_DATE`,
          [session.publisher_id, session.offer_id]
        );

        if (daily_cap !== null && creditedRes.rows[0].count >= daily_cap) {
          finalStatus = "CAP_REACHED";
          triggerCap = true;
        } else if (Number(pass_percent ?? 100) < 100 && Math.random() * 100 >= Number(pass_percent)) {
          finalStatus = "SCRUBBED";
          triggerHold = true;
        } else {
          isCredited = true;
          creditedAt = new Date();
        }
      } else {
        isCredited = true;
        creditedAt = new Date();
      }
    }

    const publisherResponse = mapPublisherResponse(
      { ...advMapped.body, session_token },
      { isHold: triggerHold, isCapReached: triggerCap }
    );

    await pool.query(
      `UPDATE pin_sessions ps
       SET advertiser_request=$1, advertiser_response=$2, publisher_response=$3,
           status=$4, publisher_credited=$5, credited_at=$6, payout=o.cpa
       FROM offers o
       WHERE ps.offer_id=o.id AND ps.session_token=$7`,
      [
        { url: advCall.used, method: advCall.method, payload, used_fallback: advCall.usedFallback },
        advertiserResponse,
        publisherResponse,
        finalStatus,
        isCredited,
        creditedAt,
        verifyRowToken
      ]
    );

    return res.json(publisherResponse);

  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
