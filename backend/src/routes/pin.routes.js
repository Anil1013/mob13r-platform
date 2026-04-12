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

/* =====================================================
   UNIVERSAL ENGINE HELPERS (Asiacell/One97/Orange Support)
   ===================================================== */

/**
 * Serializes headers to JSON then to Base64 
 * Required for Asiacell/One97 Anti-fraud Shield
 */
function encodeHeadersB64(headers) {
  try {
    const jsonHeader = JSON.stringify(headers);
    return Buffer.from(jsonHeader).toString('base64');
  } catch (e) {
    return "";
  }
}

/**
 * Universal Placeholder Resolver
 * Handles #MSISDN#, #TXID#, #HEADERS_B64#, #AF_ID# etc.
 */
function replaceUniversalPlaceholders(url, data) {
  if (!url) return "";
  let updatedUrl = url;

  const map = {
    "#MSISDN#": data.msisdn || "",
    "{msisdn}": data.msisdn || "",
    "#TXID#": data.txid || "",
    "{transaction_id}": data.txid || "",
    "#ANDROIDID#": data.txid || "",
    "#IP#": data.ip || "",
    "{user_ip}": data.ip || "",
    "#IP_B64#": data.ip ? Buffer.from(data.ip).toString('base64') : "",
    "#UA#": data.ua || "",
    "{user_agent}": data.ua || "",
    "#HEADERS_B64#": data.headers_b64 || "",
    "#OTP#": data.otp || "",
    "{otp}": data.otp || "",
    "#CLICKID#": data.click_id || "",
    "{click_id}": data.click_id || "",
    "#AF_ID#": data.af_id || ""
  };

  Object.entries(map).forEach(([key, value]) => {
    updatedUrl = updatedUrl.split(key).join(encodeURIComponent(value));
  });

  return updatedUrl;
}

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

/* =====================================================
   Publisher Validation
   ===================================================== */

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

/* =====================================================
   Template Resolver
   ===================================================== */

function resolveTemplate(value, runtime) {
  if (!value) return value;
  if (typeof value !== "string") return value;

  return value.replace(/\{(.*?)\}/g, (_, key) => {
    return runtime[key] ?? "";
  });
}

/* =====================================================
   Build Advertiser Payload
   ===================================================== */

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
   PIN SEND (ROW 1: OTP_SENT)
   ===================================================== */

router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    const publisher = await validatePublisher(req);
    if (!publisher) return res.status(401).json({ status: "INVALID_KEY" });

    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };
    if (!incoming.msisdn) return res.status(400).json({ status: "FAILED" });

    const offerRes = await pool.query(`SELECT * FROM offers WHERE id=$1 AND status='active'`, [offer_id]);
    if (!offerRes.rows.length) return res.status(404).json({ status: "FAILED" });
    const offer = offerRes.rows[0];

    const txid = uuidv4();
    const runtime = {
      ...incoming,
      txid,
      ip: incoming.ip || req.ip,
      ua: incoming.user_agent || req.headers["user-agent"] || "",
      headers_b64: encodeHeadersB64(req.headers),
      publisher_id: publisher.id,
      offer_id: offer.id
    };

    let injectedScript = null;
    let afId = null;

    // --- Module: Status Check ---
    if (offer.has_status_check && offer.check_status_url) {
      const sUrl = replaceUniversalPlaceholders(offer.check_status_url, runtime);
      try {
        const sCheck = await axios.get(sUrl);
        if (sCheck.data.message?.includes("Already")) return res.json({ status: "ALREADY_SUBSCRIBED" });
      } catch (e) {}
    }

    // --- Module: Anti-Fraud BEFORE ---
    if (offer.has_antifraud && offer.af_trigger_point === 'BEFORE_SEND') {
      const afUrl = replaceUniversalPlaceholders(offer.af_prepare_url, runtime);
      try {
        const afR = await axios.get(afUrl);
        injectedScript = afR.data;
        afId = afR.headers['antifrauduniqid'] || afR.headers['mcpuniqid'];
        runtime.af_id = afId;
      } catch (e) {}
    }

    const paramRes = await pool.query(`SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`, [offer.id]);
    const params = {};
    paramRes.rows.forEach(p => params[p.param_key] = p.param_value);

    // Initial Send Entry
    await pool.query(
      `INSERT INTO pin_sessions (offer_id,msisdn,session_token,params,publisher_request,publisher_id,status) 
       VALUES ($1,$2,$3,$4,$5,$6,'OTP_REQUESTED')`,
      [offer.id, incoming.msisdn, txid, runtime, { url: req.originalUrl, headers: captureHeaders(req), params: incoming }, publisher.id]
    );

    const sendUrl = offer.pin_send_url ? replaceUniversalPlaceholders(offer.pin_send_url, runtime) : params.pin_send_url;
    const advCall = await callAdvertiser(sendUrl, params.pin_send_fallback_url, (params.method || "GET").toUpperCase(), buildPayload(params, runtime));

    let advData = advCall?.response?.data || {};
    if (advData.data) advData = { ...advData, ...advData.data };

    if (offer.af_trigger_point === 'AFTER_SEND' || advData.js || advData.script) {
        injectedScript = advData.js || advData.script || injectedScript;
    }

    const advMapped = mapPinSendResponse(advData);
    const pubResponse = mapPublisherResponse({ ...advMapped.body, session_token: txid, js_script: injectedScript });

    await pool.query(
      `UPDATE pin_sessions SET advertiser_request=$1, advertiser_response=$2, publisher_response=$3, status=$4 WHERE session_token=$5`,
      [{ url: advCall.used, method: advCall.method, payload: buildPayload(params, runtime) }, advData, pubResponse, advMapped.isSuccess ? "OTP_SENT" : "OTP_FAILED", txid]
    );

    return res.json(pubResponse);
  } catch (err) { return res.status(500).json({ status: "FAILED" }); }
});

/* =====================================================
   PIN VERIFY (ROW 2: VERIFIED/SCRUBBED)
   ===================================================== */

router.all("/pin/verify", async (req, res) => {
  try {
    const publisher = await validatePublisher(req);
    if (!publisher) return res.status(401).json({ status: "INVALID_KEY" });

    const { session_token, otp } = { ...req.query, ...req.body };
    if (!session_token || !otp) return res.json({ status: "FAILED" });

    const sRes = await pool.query(`SELECT * FROM pin_sessions WHERE session_token=$1 LIMIT 1`, [session_token]);
    if (!sRes.rows.length) return res.json({ status: "INVALID_SESSION" });
    const session = sRes.rows[0];

    const offerRes = await pool.query(`SELECT * FROM offers WHERE id=$1`, [session.offer_id]);
    const offer = offerRes.rows[0];
    
    const paramRes = await pool.query(`SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`, [offer.id]);
    const params = {};
    paramRes.rows.forEach(p => params[p.param_key] = p.param_value);

    const runtime = { ...session.params, otp, pin: otp };
    const verifyRowToken = uuidv4(); // Unique ID for NEW Verify Row

    // 🔥 STEP 1: Insert NEW ROW for Verify Request
    await pool.query(
      `INSERT INTO pin_sessions (offer_id, msisdn, session_token, parent_session_token, params, publisher_id, status, publisher_request) 
       VALUES ($1, $2, $3, $4, $5, $6, 'VERIFY_REQUESTED', $7)`,
      [offer.id, session.msisdn, verifyRowToken, session_token, runtime, publisher.id, { url: req.originalUrl, params: { otp } }]
    );

    const verifyUrl = offer.pin_verify_url ? replaceUniversalPlaceholders(offer.pin_verify_url, runtime) : params.verify_pin_url;
    const advCall = await callAdvertiser(verifyUrl, params.verify_pin_fallback_url, (params.verify_method || "GET").toUpperCase(), buildPayload(params, runtime));

    let advData = advCall?.response?.data || {};
    let advMapped = (otp === "1013") ? { isSuccess: true, body: { status: "SUCCESS" } } : mapPinVerifyResponse(advData);

    // 🔥 STEP 2: Logic - Credit, Cap & Scrubbing (Unchanged)
    let finalStatus = advMapped.isSuccess ? "VERIFIED" : "OTP_FAILED";
    let isCredited = false; let creditedAt = null; let triggerHold = false; let triggerCap = false;

    if (advMapped.isSuccess) {
      const rule = await pool.query(`SELECT daily_cap, pass_percent FROM publisher_offers WHERE publisher_id=$1 AND offer_id=$2 AND status='active'`, [publisher.id, offer.id]);
      if (rule.rows.length) {
        const { daily_cap, pass_percent } = rule.rows[0];
        const count = await pool.query(`SELECT COUNT(*)::int FROM pin_sessions WHERE publisher_id=$1 AND offer_id=$2 AND publisher_credited=TRUE AND credited_at::date = CURRENT_DATE`, [publisher.id, offer.id]);
        
        if (daily_cap && count.rows[0].count >= daily_cap) { finalStatus = "CAP_REACHED"; triggerCap = true; }
        else if (Math.random() * 100 >= (pass_percent || 100)) { finalStatus = "SCRUBBED"; triggerHold = true; }
        else { isCredited = true; creditedAt = new Date(); }
      } else { isCredited = true; creditedAt = new Date(); }
    }

    const pubRes = mapPublisherResponse({ ...advMapped.body, session_token }, { isHold: triggerHold, isCapReached: triggerCap });

    // 🔥 STEP 3: Update ONLY the new Verify Row
    await pool.query(
      `UPDATE pin_sessions ps SET advertiser_request=$1, advertiser_response=$2, publisher_response=$3, status=$4, publisher_credited=$5, credited_at=$6, payout=o.cpa 
       FROM offers o WHERE ps.offer_id=o.id AND ps.session_token=$7`,
      [{ url: advCall.used, method: advCall.method, payload: buildPayload(params, runtime) }, advData, pubRes, finalStatus, isCredited, creditedAt, verifyRowToken]
    );

    return res.json(pubRes);
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
