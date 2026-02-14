import pool from "../db.js";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";

import { advertiserCall } from "./advertiserAdapter.js";
import { fraudCheck } from "./fraudService.js";
import { retryCall } from "./retryService.js";
import { logMetrics } from "./metricsService.js";
import { logSession } from "./loggerService.js";
import { chooseBestAdvertiser } from "./aiRouterService.js";

import {
  mapPinSendResponse,
  mapPinVerifyResponse
} from "./advResponseMapper.js";

import { mapPublisherResponse } from "./pubResponseMapper.js";

/* ============================================================
   🔥 PIN SEND
============================================================ */

export async function handlePinSend(req) {

  const startTime = Date.now();

  try {

    const offerId = req.params.offer_id;
    const incoming = { ...req.query, ...req.body };

    await fraudCheck(incoming);

    const sessionToken = uuidv4();

    /* ================= FETCH OFFER ================= */

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1`,
      [offerId]
    );

    if (!offerRes.rows.length) {
      throw new Error("Offer not found");
    }

    let offer = offerRes.rows[0];

    /* ================= AI ROUTER ================= */

    const bestAdvertiser = await chooseBestAdvertiser(offer, incoming);

    if (bestAdvertiser) {
      offer.advertiser_id = bestAdvertiser.id;
    }

    /* ================= OFFER PARAMETERS ================= */

    const paramRes = await pool.query(
      `SELECT param_key, param_value
       FROM offer_parameters
       WHERE offer_id=$1`,
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

    /* ================= CREATE SESSION FIRST ================= */

    await pool.query(
      `INSERT INTO pin_sessions
       (offer_id, session_token, msisdn, params, status)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        offer.id,
        sessionToken,
        incoming.msisdn || null,
        finalParams,
        "INIT"
      ]
    );

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

    const advMapped = mapPinSendResponse(advResult);
    const pubMapped = mapPublisherResponse(advMapped.body);

    const advSessionKey =
      advResult?.sessionKey ||
      advResult?.session_key ||
      advResult?.sessionkey ||
      null;

    /* ================= UPDATE SESSION ================= */

    await pool.query(
      `UPDATE pin_sessions
       SET status=$1,
           advertiser_response=$2,
           publisher_response=$3,
           adv_session_key=$4
       WHERE session_token=$5::uuid`,
      [
        pubMapped.status,
        advMapped.body,
        pubMapped,
        advSessionKey,
        sessionToken
      ]
    );

    /* ================= METRICS ================= */

    await logMetrics({
      advertiser: offer.advertiser_id,
      status: pubMapped.status,
      latency: Date.now() - startTime
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


/* ============================================================
   🔥 PIN VERIFY
============================================================ */

export async function handlePinVerify(req) {

  const startTime = Date.now();

  try {

    const input = {
      session_token: String(req.query.session_token || ""),
      otp: String(req.query.otp || ""),
      ip: req.query.ip || null
    };

    if (!uuidValidate(input.session_token)) {
      throw new Error("Invalid session_token");
    }

    if (!input.otp) {
      throw new Error("OTP required");
    }

    /* ================= FETCH SESSION ================= */

    const sessionRes = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token=$1::uuid`,
      [input.session_token]
    );

    if (!sessionRes.rows.length) {
      throw new Error("Session not found");
    }

    const session = sessionRes.rows[0];

    if (!session.adv_session_key) {
      throw new Error("Missing advertiser sessionKey");
    }

    /* ================= FETCH OFFER ================= */

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1`,
      [session.offer_id]
    );

    const offer = offerRes.rows[0];

    /* ================= AI ROUTER ================= */

    const bestAdvertiser =
      await chooseBestAdvertiser(offer, session.params);

    /* ================= OFFER PARAMS ================= */

    const paramRes = await pool.query(
      `SELECT param_key,param_value
       FROM offer_parameters
       WHERE offer_id=$1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => {
      staticParams[p.param_key] = p.param_value;
    });

    /* ================= BUILD PAYLOAD ================= */

    const payload = {
      ...session.params,
      otp: input.otp,
      sessionKey: session.adv_session_key
    };

    /* ================= LOG VERIFY REQUEST ================= */

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
  `
  UPDATE pin_sessions
  SET status = $1::text,
      advertiser_response = $2::jsonb,
      publisher_response = $3::jsonb,
      verified_at = CASE
        WHEN $1::text = 'SUCCESS' THEN NOW()
        ELSE verified_at
      END
  WHERE session_token = $4::uuid
  `,
  [
    String(pubMapped.status),
    JSON.stringify(advMapped.body),
    JSON.stringify(pubMapped),
    input.session_token
  ]
);


    /* ================= METRICS ================= */

    await logMetrics({
      advertiser: bestAdvertiser?.id || offer.advertiser_id,
      status: pubMapped.status,
      latency: Date.now() - startTime
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
