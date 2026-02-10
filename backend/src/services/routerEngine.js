import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";

import { advertiserCall } from "./advertiserAdapter.js";
import { fraudCheck } from "./fraudService.js";
import { retryCall } from "./retryService.js";
import { logMetrics } from "./metricsService.js";
import { logSession } from "./loggerService.js";

import {
  mapPinSendResponse,
  mapPinVerifyResponse
} from "./advResponseMapper.js";

import { mapPublisherResponse } from "./pubResponseMapper.js";

export async function handlePinSend(req) {

  const startTime = Date.now();

  const offerId = req.params.offer_id;
  const incoming = { ...req.query, ...req.body };

  /* ================= FRAUD ================= */

  await fraudCheck(incoming);

  /* ================= SESSION ================= */

  const sessionToken = uuidv4();

  const offerRes = await pool.query(
    `SELECT * FROM offers WHERE id=$1`,
    [offerId]
  );

  const offer = offerRes.rows[0];

  const paramRes = await pool.query(
    `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
    [offer.id]
  );

  const staticParams = {};
  paramRes.rows.forEach(p => {
    staticParams[p.param_key] = p.param_value;
  });

  const finalParams = {
    ...incoming,
    ...staticParams
  };

  /* ================= LOG PUBLISHER REQUEST ================= */

  await logSession(sessionToken, {
    publisher_request: {
      url: req.originalUrl,
      params: incoming,
      headers: req.headers
    }
  });

  /* ================= ADVERTISER CALL ================= */

  const advResult = await retryCall(() =>
    advertiserCall(staticParams.pin_send_url, finalParams)
  );

  const advMapped = mapPinSendResponse(advResult);
  const pubMapped = mapPublisherResponse(advMapped.body);

  /* ================= SAVE SESSION ================= */

  await pool.query(
    `INSERT INTO pin_sessions
     (offer_id,session_token,msisdn,status,advertiser_response,publisher_response)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      offer.id,
      sessionToken,
      incoming.msisdn,
      pubMapped.status,
      advMapped.body,
      pubMapped
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
}

/* ================= VERIFY ================= */

export async function handlePinVerify(req) {

  const input = { ...req.query, ...req.body };

  const sessionRes = await pool.query(
    `SELECT * FROM pin_sessions WHERE session_token=$1`,
    [input.session_token]
  );

  const session = sessionRes.rows[0];

  const offerRes = await pool.query(
    `SELECT * FROM offers WHERE id=$1`,
    [session.offer_id]
  );

  const offer = offerRes.rows[0];

  const paramRes = await pool.query(
    `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
    [offer.id]
  );

  const staticParams = {};
  paramRes.rows.forEach(p => staticParams[p.param_key] = p.param_value);

  const payload = {
    ...session.params,
    otp: input.otp,
    sessionKey: session.adv_session_key
  };

  const advResp = await advertiserCall(
    staticParams.verify_pin_url,
    payload
  );

  const advMapped = mapPinVerifyResponse(advResp);
  const pubMapped = mapPublisherResponse(advMapped.body);

  await pool.query(
    `UPDATE pin_sessions
     SET status=$1,
         advertiser_response=$2,
         publisher_response=$3
     WHERE session_token=$4`,
    [pubMapped.status, advMapped.body, pubMapped, input.session_token]
  );

  return {
    httpCode: advMapped.httpCode,
    body: pubMapped
  };
}
