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

    // ✅ Duplicate MSISDN check — same MSISDN same offer same day
    const dupCheck = await pool.query(
      `SELECT COUNT(*) AS cnt FROM pin_sessions
       WHERE msisdn = $1 AND offer_id = $2
       AND status IN ('VERIFIED','SCRUBBED','CAP_REACHED')
       AND parent_session_token IS NOT NULL
       AND created_at::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
      [incoming.msisdn, offer_id]
    );
    if (Number(dupCheck.rows[0].cnt) > 0) {
      return res.status(400).json({ status: "DUPLICATE", message: "This number has already been subscribed today." });
    }

    // ✅ MSISDN Prefix Validation — carrier + geo check
    if (offer.carrier && offer.geo) {
      const msisdn = String(incoming.msisdn).replace(/[^0-9]/g, "");
      const prefixRes = await pool.query(
        `SELECT prefix FROM carrier_prefixes WHERE LOWER(carrier) = LOWER($1) AND UPPER(geo) = UPPER($2)`,
        [offer.carrier, offer.geo]
      );
      if (prefixRes.rows.length > 0) {
        const normalizedMsisdn = msisdn.replace(/^00/, "");
        const matched = prefixRes.rows.some(row => {
          const p = row.prefix.replace(/[^0-9]/g, "");
          return normalizedMsisdn.startsWith(p);
        });
        if (!matched) {
          return res.status(400).json({
            status: "WRONG_CARRIER",
            message: `This offer is only for ${offer.carrier} (${offer.geo}) subscribers. Please use a valid ${offer.carrier} number.`
          });
        }
      }
    }

    // Fetch ALL params (active + inactive) — we need URL/method from all
    const paramRes = await pool.query(
      `SELECT param_key, param_value, is_active FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );
    const allParams = paramRes.rows;

    const ua = incoming.user_agent || req.headers["user-agent"] || "";
    const ip = incoming.ip || req.headers["x-forwarded-for"] || req.ip || "";
    // NOTE: encodeHeadersB64(req.headers) would encode OUR OWN internal
    // server-to-server call's headers (generic 'axios/x.x.x' user-agent,
    // no real referer) — not the actual end-user's browser fingerprint,
    // which antifraud providers like the Zain/Puretech integration need
    // for accurate fraud scoring. Build it from what the LANDING PAGE
    // actually captured and forwarded instead (incoming.referer /
    // incoming.accept_language, sent from DynamicLanding.jsx alongside
    // user_agent, which was already being forwarded correctly).
    const antifraudHeaders = {
      "User-Agent": ua,
      "Referer": incoming.referer || "",
      "Accept-Language": incoming.accept_language || "",
    };

    const runtime = {
      ...incoming,
      ip,
      user_ip: ip,
      user_agent: ua,
      ua,
      userAgent: ua,
      publisher_id: publisher.id,
      pub_id: publisher.id,
      offer_id: offer.id,
      headers_b64: encodeHeadersB64(antifraudHeaders)
    };

    // Antifraud/Status workflow
    const workflow = await executeWorkflowSteps(offer, runtime, "send");
    if (workflow.block) return res.json({ status: "ALREADY_SUBSCRIBED" });

    // IMPORTANT: alias to BOTH names — offer templates written with
    // {antifraud_uniqid} (matches the advertiser's own param naming, e.g.
    // Puretech/Zain) were silently resolving to blank, since this used to
    // only ever set runtime.af_id and nothing else. {af_id} keeps working too.
    runtime.af_id = workflow.afId;
    runtime.antifraud_uniqid = workflow.afId;
    let injectedScript = workflow.injectedScript;

    // Build payload — only is_active=true params
    const sessionToken = uuidv4();
    runtime.session_token = sessionToken;
    runtime.click_id = sessionToken;
    // ClickID for antifraud must be unique, alphanumeric-only, ≤50 chars —
    // a raw UUID has hyphens, so strip them.
    runtime.txid = sessionToken.replace(/-/g, "");

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
   PREPARE ANTIFRAUD FOR VERIFY (page-load timing)
   Called by the landing page right when it shows the OTP-entry screen —
   BEFORE the user submits — so any antifraud-provider script that needs
   to observe behavior leading up to the submit click (e.g. cgparcel's
   Zain integration, which attaches to elements with class "AFsubmitbtn")
   gets a chance to actually run. The actual /pin/verify call later reuses
   whatever this generates instead of minting a second, late one.
   Completely harmless no-op for any offer not using BEFORE_VERIFY.
===================================================== */
router.all("/pin/prepare-verify", async (req, res) => {
  try {
    const publisher = await validatePublisher(req);
    if (!publisher) return res.status(401).json({ status: "INVALID_KEY" });

    const { session_token, referer, accept_language } = { ...req.query, ...req.body };
    if (!session_token) return res.json({ status: "FAILED", message: "session_token required" });

    const sRes = await pool.query(`SELECT * FROM pin_sessions WHERE session_token=$1`, [session_token]);
    if (!sRes.rows.length) return res.json({ status: "INVALID_SESSION" });
    const session = sRes.rows[0];

    const offerRes = await pool.query(`SELECT * FROM offers WHERE id=$1`, [session.offer_id]);
    const offer = offerRes.rows[0];

    if (!offer?.has_antifraud || offer.af_trigger_point !== "BEFORE_VERIFY") {
      return res.json({ status: "SUCCESS", antifraud_uniqid: null, injected_script: null });
    }

    const ua = session.params?.user_agent || req.headers["user-agent"] || "";
    const ip = session.params?.ip || req.headers["x-forwarded-for"] || req.ip || "";
    const verifyRowToken = uuidv4();

    const runtime = {
      ...session.params,
      ip, user_ip: ip, user_agent: ua, ua, userAgent: ua,
      txid: verifyRowToken.replace(/-/g, ""),
      headers_b64: encodeHeadersB64({
        "User-Agent": ua,
        "Referer": referer || session.params?.referer || "",
        "Accept-Language": accept_language || session.params?.accept_language || "",
      }),
    };

    const workflow = await executeWorkflowSteps(offer, runtime, "verify");

    // Persist so the real /pin/verify call (which may happen seconds later,
    // after the user types their OTP) reuses this exact value instead of
    // generating a second one.
    await pool.query(
      `UPDATE pin_sessions SET params = params || $1::jsonb WHERE session_token = $2`,
      [JSON.stringify({ antifraud_uniqid: workflow.afId, af_id: workflow.afId }), session_token]
    );

    return res.json({ status: "SUCCESS", antifraud_uniqid: workflow.afId, injected_script: workflow.injectedScript });
  } catch (err) {
    console.error("PREPARE VERIFY ERROR:", err);
    return res.json({ status: "SUCCESS", antifraud_uniqid: null, injected_script: null }); // fail open — never block the OTP flow over this
  }
});

/* =====================================================
   PIN VERIFY
===================================================== */

router.all("/pin/verify", async (req, res) => {
  try {
    const publisher = await validatePublisher(req);
    if (!publisher) return res.status(401).json({ status: "INVALID_KEY" });

    const { session_token, otp, referer: verifyReferer, accept_language: verifyAcceptLang } = { ...req.query, ...req.body };
    if (!session_token || !otp) return res.json({ status: "FAILED", message: "session_token and otp required" });

    const sRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token=$1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [session_token]
    );
    if (!sRes.rows.length) {
      // Check if session exists but expired
      const expiredCheck = await pool.query(`SELECT id FROM pin_sessions WHERE session_token=$1`, [session_token]);
      if (expiredCheck.rows.length) {
        return res.json({ status: "FAILED", message: "Session expired. Please request a new OTP." });
      }
      return res.json({ status: "INVALID_SESSION" });
    }

    const session = sRes.rows[0];

    // Fetch ALL params
    const paramRes = await pool.query(
      `SELECT param_key, param_value, is_active FROM offer_parameters WHERE offer_id=$1`,
      [session.offer_id]
    );
    const allParams = paramRes.rows;

    const offerRes = await pool.query(`SELECT * FROM offers WHERE id=$1`, [session.offer_id]);
    const offer = offerRes.rows[0];

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
      userAgent: ua,
      headers_b64: encodeHeadersB64({
        "User-Agent": ua,
        "Referer": verifyReferer || session.params?.referer || "",
        "Accept-Language": verifyAcceptLang || session.params?.accept_language || "",
      }),
    };

    // Antifraud at VERIFY point — prefer whatever /pin/prepare-verify already
    // generated (correct timing per Puretech/cgparcel's docs — before the
    // user submits, not during). Only generate fresh here as a fallback, in
    // case the landing page never called prepare-verify for some reason —
    // this keeps the flow working either way rather than failing.
    if (session.params?.antifraud_uniqid) {
      runtime.af_id = session.params.antifraud_uniqid;
      runtime.antifraud_uniqid = session.params.antifraud_uniqid;
    } else {
      runtime.txid = uuidv4().replace(/-/g, "");
      const verifyWorkflow = await executeWorkflowSteps(offer, runtime, "verify");
      if (verifyWorkflow.afId) {
        runtime.af_id = verifyWorkflow.afId;
        runtime.antifraud_uniqid = verifyWorkflow.afId;
      }
    }

    // Build payload — only is_active=true params (skipOtp=false for VERIFY so pin/otp IS included)
    const payload = buildPayload(allParams, runtime, false);

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

    // (offer already fetched above, before runtime construction)

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

    // The cap-check-then-credit decision below reads a COUNT and a
    // counter column, then later writes based on what it saw — not
    // atomic on its own. Multiple concurrent verify requests for the
    // SAME publisher+offer near a cap boundary could otherwise all see
    // "still under cap" before any of them commits, and all get
    // credited — overshooting daily_cap by however many raced through.
    // pg_advisory_xact_lock serializes this critical section per
    // (publisher_id, offer_id) pair — held only for this transaction,
    // released automatically at COMMIT/ROLLBACK — so concurrent
    // requests for the same pair queue up instead of racing.
    const lockClient = await pool.connect();
    try {
      await lockClient.query("BEGIN");
      await lockClient.query(
        `SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $2))`,
        [String(session.publisher_id), String(session.offer_id)]
      );

      if (advMapped.isSuccess) {
        const ruleRes = await lockClient.query(
          `SELECT daily_cap, pass_percent FROM publisher_offers
           WHERE publisher_id=$1 AND offer_id=$2 AND status='active'`,
          [session.publisher_id, session.offer_id]
        );

        if (ruleRes.rows.length > 0) {
          const { daily_cap, pass_percent } = ruleRes.rows[0];
          const creditedRes = await lockClient.query(
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

      // Pehle daily reset (IST midnight)
      await lockClient.query(
        `UPDATE offers SET today_hits = 0, last_reset_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
         WHERE id = $1 AND last_reset_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
        [session.offer_id]
      );

      // Phir increment — also inside the lock, so this offer-level cap
      // can't overshoot either, consistent with the publisher-level check above.
      if (isCredited) {
        await lockClient.query(
          `UPDATE offers SET today_hits = today_hits + 1 WHERE id = $1`,
          [session.offer_id]
        );
      }

      await lockClient.query("COMMIT");
    } catch (err) {
      await lockClient.query("ROLLBACK");
      throw err;
    } finally {
      lockClient.release();
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
