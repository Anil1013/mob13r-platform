import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";

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

/* ======================================================
   🔥 PIN SEND (AI ROUTED)
====================================================== */
export async function handlePinSend(req) {

  const startTime = Date.now();
  const offerId = req.params.offer_id;
  const incoming = { ...req.query, ...req.body };

  /* ===== FRAUD CHECK ===== */
  await fraudCheck(incoming);

  const sessionToken = uuidv4();

  /* ===== FETCH OFFER ===== */
  const offerRes = await pool.query(
    `SELECT * FROM offers WHERE id=$1`,
    [offerId]
  );

  if (!offerRes.rows.length) {
    throw new Error("Offer not found");
  }

  let offer = offerRes.rows[0];

  /* ===== AI ROUTER ===== */
  let advertiser = await chooseBestAdvertiser(offer, incoming);

  if (!advertiser) {
    // fallback to default advertiser
    const advRes = await pool.query(
      `SELECT * FROM advertisers WHERE id=$1`,
      [offer.advertiser_id]
    );
    advertiser = advRes.rows[0];
  }

  /* ===== LOAD OFFER PARAMS ===== */
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

  const finalParams = {
    ...staticParams,
    ...incoming
  };

  /* ===== LOG PUBLISHER REQUEST ===== */
  await logSession(sessionToken, {
    publisher_request: {
      url: req.originalUrl,
      params: incoming,
      headers: req.headers
    }
  });

  /* ===== LOG ADVERTISER REQUEST ===== */
  await logSession(sessionToken, {
    advertiser_request: {
      url: staticParams.pin_send_url,
      params: finalParams,
      method: (staticParams.method || "GET").toUpperCase()
    }
  });

  /* ===== CALL ADVERTISER ===== */
  const advResult = await retryCall(() =>
    advertiserCall(staticParams.pin_send_url, finalParams)
  );

  const advMapped = mapPinSendResponse(advResult);
  const pubMapped = mapPublisherResponse(advMapped.body);

  /* ===== SESSION KEY EXTRACTION ===== */
  const advSessionKey =
    advResult?.sessionKey ||
    advResult?.session_key ||
    advResult?.sessionkey ||
    null;

  /* ===== SAVE SESSION ===== */
  await pool.query(
    `INSERT INTO pin_sessions
     (offer_id, advertiser_id, session_token, msisdn, status,
      advertiser_response, publisher_response, adv_session_key, params)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      offer.id,
      advertiser.id,
      sessionToken,
      incoming.msisdn,
      pubMapped.status,
      advMapped.body,
      pubMapped,
      advSessionKey,
      finalParams
    ]
  );

  /* ===== METRICS ===== */
  await logMetrics({
    route: "SEND",
    latency: Date.now() - startTime,
    advertiser: advertiser.id,
    status: pubMapped.status
  });

  return {
    httpCode: advMapped.httpCode,
    body: {
      ...pubMapped,
      session_token: sessionToken
    }
  };
}

/* ======================================================
   🔥 PIN VERIFY (AI ROUTED + SESSION LOCK)
====================================================== */
export async function handlePinVerify(req) {

  const startTime = Date.now();
  const input = { ...req.query, ...req.body };

  if (!input.session_token) {
    throw new Error("session_token required");
  }

  /* ===== FETCH SESSION ===== */
  const sessionRes = await pool.query(
    `SELECT * FROM pin_sessions WHERE session_token=$1`,
    [input.session_token]
  );

  if (!sessionRes.rows.length) {
    throw new Error("Invalid session");
  }

  const session = sessionRes.rows[0];

  if (!session.adv_session_key) {
    throw new Error("Missing advertiser sessionKey");
  }

  /* ===== FETCH OFFER ===== */
  const offerRes = await pool.query(
    `SELECT * FROM offers WHERE id=$1`,
    [session.offer_id]
  );

  const offer = offerRes.rows[0];

  /* ===== FETCH ADVERTISER (LOCK SAME AS SEND) ===== */
  const advRes = await pool.query(
    `SELECT * FROM advertisers WHERE id=$1`,
    [session.advertiser_id]
  );

  const advertiser = advRes.rows[0];

  /* ===== LOAD PARAMS ===== */
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

  const payload = {
    ...session.params,
    otp: input.otp,
    sessionKey: session.adv_session_key
  };

  /* ===== LOG VERIFY REQUEST ===== */
  await logSession(session.session_token, {
    advertiser_request: {
      url: staticParams.verify_pin_url,
      params: payload,
      method: (staticParams.method || "GET").toUpperCase()
    }
  });

  /* ===== CALL ADVERTISER ===== */
  const advResp = await retryCall(() =>
    advertiserCall(staticParams.verify_pin_url, payload)
  );

  const advMapped = mapPinVerifyResponse(advResp);
  const pubMapped = mapPublisherResponse(advMapped.body);

  /* ===== UPDATE SESSION ===== */
  await pool.query(
    `UPDATE pin_sessions
     SET status=$1,
         advertiser_response=$2,
         publisher_response=$3,
         verified_at =
           CASE WHEN $1='SUCCESS' THEN NOW() ELSE verified_at END
     WHERE session_token=$4`,
    [
      pubMapped.status,
      advMapped.body,
      pubMapped,
      input.session_token
    ]
  );

  /* ===== METRICS ===== */
  await logMetrics({
    route: "VERIFY",
    latency: Date.now() - startTime,
    advertiser: advertiser.id,
    status: pubMapped.status
  });

  return {
    httpCode: advMapped.httpCode,
    body: pubMapped
  };
}
