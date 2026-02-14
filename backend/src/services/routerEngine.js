import pool from "../db.js";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";

import { advertiserCall } from "./advertiserAdapter.js";
import { fraudCheck } from "./fraudService.js";
import { retryCall } from "./retryService.js";
import { logMetrics } from "./metricsService.js";
import { logSession } from "./loggerService.js";

/* ⭐ AI ROUTER */
import { chooseBestAdvertiser } from "./aiRouterService.js";

import {
  mapPinSendResponse,
  mapPinVerifyResponse
} from "./advResponseMapper.js";

import { mapPublisherResponse } from "./pubResponseMapper.js";



/* ======================================================
   🔥 PIN SEND
====================================================== */
export async function handlePinSend(req) {

  const startTime = Date.now();

  try {

    const offerId = req.params.offer_id;
    const incoming = { ...req.query, ...req.body };

    /* ================= FRAUD ================= */
    await fraudCheck(incoming);

    /* ================= SESSION ================= */
    const sessionToken = uuidv4();

    /* ================= OFFER ================= */
    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1`,
      [offerId]
    );

    if (!offerRes.rows.length) {
      throw new Error("Offer not found");
    }

    let offer = offerRes.rows[0];

    /* ⭐ AI ADVERTISER SELECT */
    const bestAdvertiser = await chooseBestAdvertiser(offer, incoming);

    if (bestAdvertiser) {
      offer.advertiser_id = bestAdvertiser.id;
    }

    /* ================= OFFER PARAMS ================= */
    const paramRes = await pool.query(
      `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => {
      staticParams[p.param_key] = p.param_value;
    });

    const finalParams = {
      ...staticParams,
      ...incoming
    };

    /* ================= LOG PUBLISHER REQUEST ================= */
    await logSession(sessionToken, {
      publisher_request: {
        url: req.originalUrl,
        params: incoming,
        headers: req.headers
      }
    });

    /* ================= LOG ADVERTISER REQUEST ================= */
    await logSession(sessionToken, {
      advertiser_request: {
        url: staticParams.pin_send_url,
        params: finalParams,
        method: (staticParams.method || "GET").toUpperCase()
      }
    });

    /* ================= CALL ADVERTISER ================= */
    const advResult = await retryCall(() =>
      advertiserCall(staticParams.pin_send_url, finalParams)
    );

    /* ================= MAP ================= */
    const advMapped = mapPinSendResponse(advResult);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ⭐ SESSION KEY EXTRACTION */
    const advSessionKey =
      advResult?.sessionKey ||
      advResult?.session_key ||
      advResult?.sessionkey ||
      null;

    /* ================= SAVE SESSION ================= */
    await pool.query(
      `INSERT INTO pin_sessions
      (offer_id, session_token, msisdn, status,
       advertiser_response, publisher_response,
       adv_session_key, params)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        offer.id,
        sessionToken,
        incoming.msisdn || null,
        pubMapped.status,
        advMapped.body,
        pubMapped,
        advSessionKey,
        finalParams
      ]
    );

    /* ================= METRICS ================= */
    await logMetrics({
      route: "SEND",
      latency: Date.now() - startTime,
      advertiser: offer.advertiser_id,
      status: pubMapped.status
    });

    return {
      httpCode: advMapped.httpCode,
      body: {
        ...pubMapped,
        session_token: sessionToken
      }
    };

  } catch (err) {

    return {
      httpCode: 500,
      body: {
        status: "FAILED",
        message: err.message
      }
    };
  }
}



/* ======================================================
   🔥 PIN VERIFY
====================================================== */
export async function handlePinVerify(req) {

  const startTime = Date.now();

  try {

    const input = {
      session_token: String(req.query.session_token || ""),
      otp: String(req.query.otp || ""),
      ip: req.query.ip || null
    };

    /* ================= VALIDATION ================= */

    if (!uuidValidate(input.session_token)) {
      throw new Error("Invalid session_token");
    }

    if (!input.otp) {
      throw new Error("OTP required");
    }

    /* ================= SESSION FETCH ================= */

    const sessionRes = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token = $1::uuid`,
      [input.session_token]
    );

    if (!sessionRes.rows.length) {
      throw new Error("Session not found");
    }

    const session = sessionRes.rows[0];

    if (!session.adv_session_key) {
      throw new Error("Missing advertiser sessionKey");
    }

    /* ================= OFFER ================= */

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1`,
      [session.offer_id]
    );

    const offer = offerRes.rows[0];

    /* ⭐ AI ADVERTISER SELECT */
    const bestAdvertiser = await chooseBestAdvertiser(offer, session.params);

    /* ================= OFFER PARAMS ================= */

    const paramRes = await pool.query(
      `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => {
      staticParams[p.param_key] = p.param_value;
    });

    /* ================= PAYLOAD ================= */

    const payload = {
      ...session.params,
      otp: input.otp,
      sessionKey: session.adv_session_key
    };

    /* ================= LOG ADVERTISER VERIFY ================= */

    await logSession(session.session_token, {
      advertiser_request: {
        url: staticParams.verify_pin_url,
        params: payload,
        method: (staticParams.method || "GET").toUpperCase()
      }
    });

    /* ================= CALL ADVERTISER ================= */

    const advResp = await retryCall(() =>
      advertiserCall(staticParams.verify_pin_url, payload)
    );

    const advMapped = mapPinVerifyResponse(advResp);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ================= UPDATE SESSION ================= */

    await pool.query(
      `UPDATE pin_sessions
       SET status=$1,
           advertiser_response=$2,
           publisher_response=$3,
           verified_at = CASE
             WHEN $1='SUCCESS' THEN NOW()
             ELSE verified_at
           END
       WHERE session_token = $4::uuid`,
      [
        pubMapped.status,
        advMapped.body,
        pubMapped,
        input.session_token
      ]
    );

    /* ================= METRICS ================= */

    await logMetrics({
      route: "VERIFY",
      latency: Date.now() - startTime,
      advertiser: bestAdvertiser?.id || offer.advertiser_id,
      status: pubMapped.status
    });

    return {
      httpCode: advMapped.httpCode,
      body: pubMapped
    };

  } catch (err) {

    return {
      httpCode: 500,
      body: {
        status: "FAILED",
        message: err.message
      }
    };
  }
}
