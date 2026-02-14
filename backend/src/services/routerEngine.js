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

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1`,
      [offerId]
    );

    if (!offerRes.rows.length)
      throw new Error("Offer not found");

    let offer = offerRes.rows[0];

    const bestAdvertiser =
      await chooseBestAdvertiser(offer, incoming);

    if (bestAdvertiser)
      offer.advertiser_id = bestAdvertiser.id;

    const paramRes = await pool.query(
      `SELECT param_key,param_value
       FROM offer_parameters
       WHERE offer_id=$1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p =>
      staticParams[p.param_key] = p.param_value
    );

    const finalParams = {
      ...staticParams,
      ...incoming
    };

    /* CREATE SESSION FIRST */

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

    await logSession(sessionToken, {
      publisher_request: {
        url: req.originalUrl,
        params: incoming,
        headers: req.headers
      }
    });

    await logSession(sessionToken, {
      advertiser_request: {
        url: staticParams.pin_send_url,
        params: finalParams,
        method: (staticParams.method || "GET").toUpperCase()
      }
    });

    const advResult = await retryCall(() =>
      advertiserCall(staticParams.pin_send_url, finalParams)
    );

    const advMapped = mapPinSendResponse(advResult);
    const pubMapped = mapPublisherResponse(advMapped.body);

    const advSessionKey =
      advResult?.sessionKey ||
      advResult?.session_key ||
      null;

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

    const sessionToken =
      String(req.query.session_token || "");

    const otp =
      String(req.query.otp || "");

    if (!uuidValidate(sessionToken))
      throw new Error("Invalid session_token");

    if (!otp)
      throw new Error("OTP required");

    const sessionRes = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token=$1::uuid`,
      [sessionToken]
    );

    if (!sessionRes.rows.length)
      throw new Error("Session not found");

    const session = sessionRes.rows[0];

    if (!session.adv_session_key)
      throw new Error("Missing advertiser sessionKey");

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1`,
      [session.offer_id]
    );

    const offer = offerRes.rows[0];

    const paramRes = await pool.query(
      `SELECT param_key,param_value
       FROM offer_parameters
       WHERE offer_id=$1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p =>
      staticParams[p.param_key] = p.param_value
    );

    const payload = {
      ...session.params,
      otp,
      sessionKey: session.adv_session_key
    };

    await logSession(sessionToken, {
      advertiser_request: {
        url: staticParams.verify_pin_url,
        params: payload,
        method: (staticParams.method || "GET").toUpperCase()
      }
    });

    const advResp = await retryCall(() =>
      advertiserCall(staticParams.verify_pin_url, payload)
    );

    const advMapped = mapPinVerifyResponse(advResp);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* IMPORTANT FIX: NO CASE, NO TYPE CONFUSION */

    if (pubMapped.status === "SUCCESS") {

      await pool.query(
        `UPDATE pin_sessions
         SET status=$1,
             advertiser_response=$2,
             publisher_response=$3,
             verified_at=NOW()
         WHERE session_token=$4::uuid`,
        [
          pubMapped.status,
          advMapped.body,
          pubMapped,
          sessionToken
        ]
      );

    } else {

      await pool.query(
        `UPDATE pin_sessions
         SET status=$1,
             advertiser_response=$2,
             publisher_response=$3
         WHERE session_token=$4::uuid`,
        [
          pubMapped.status,
          advMapped.body,
          pubMapped,
          sessionToken
        ]
      );
    }

    await logMetrics({
      advertiser: offer.advertiser_id,
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
