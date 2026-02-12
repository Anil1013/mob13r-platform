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
   PIN SEND
====================================================== */
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

    /* AI SELECT */
    let bestAdvertiser = await chooseBestAdvertiser(offer, incoming);

    if (!bestAdvertiser) {
      bestAdvertiser = { id: offer.advertiser_id };
    }

    const paramRes = await pool.query(
      `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p=>{
      staticParams[p.param_key] = p.param_value;
    });

    const finalParams = {
      ...staticParams,
      ...incoming
    };

    /* INSERT SESSION FIRST */
    await pool.query(
      `INSERT INTO pin_sessions
       (offer_id, session_token, msisdn, params)
       VALUES ($1,$2,$3,$4)`,
      [offer.id, sessionToken, incoming.msisdn, finalParams]
    );

    /* LOG PUBLISHER */
    await logSession(sessionToken,{
      publisher_request:{
        url:req.originalUrl,
        params:incoming,
        headers:req.headers
      }
    });

    /* LOG ADVERTISER REQUEST */
    await logSession(sessionToken,{
      advertiser_request:{
        url:staticParams.pin_send_url,
        params:finalParams
      }
    });

    /* CALL ADVERTISER */
    const advResult = await retryCall(()=>{
      return advertiserCall(staticParams.pin_send_url, finalParams);
    });

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
       WHERE session_token=$5`,
      [
        pubMapped.status,
        advMapped.body,
        pubMapped,
        advSessionKey,
        sessionToken
      ]
    );

    await logMetrics({
      route:"SEND",
      latency:Date.now()-startTime,
      advertiser:bestAdvertiser.id,
      status:pubMapped.status
    });

    return {
      httpCode: advMapped.httpCode,
      body:{
        ...pubMapped,
        session_token: sessionToken
      }
    };

  } catch(err){

    console.error("PIN SEND ROUTER ERROR:", err.message);

    return {
      httpCode:500,
      body:{
        status:"FAILED",
        message:err.message
      }
    };
  }
}


/* ======================================================
   PIN VERIFY
====================================================== */
export async function handlePinVerify(req){

  try{

    const input = { ...req.query, ...req.body };

    if(!input.session_token)
      throw new Error("session_token required");

    const sessionRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token=$1`,
      [input.session_token]
    );

    if(!sessionRes.rows.length)
      throw new Error("Invalid session");

    const session = sessionRes.rows[0];

    if(!session.adv_session_key)
      throw new Error("Missing advertiser sessionKey");

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
    paramRes.rows.forEach(p=>{
      staticParams[p.param_key] = p.param_value;
    });

    const payload = {
      ...session.params,
      otp:input.otp,
      sessionKey:session.adv_session_key
    };

    await logSession(session.session_token,{
      advertiser_request:{
        url:staticParams.verify_pin_url,
        params:payload
      }
    });

    const advResp = await retryCall(()=>{
      return advertiserCall(staticParams.verify_pin_url, payload);
    });

    const advMapped = mapPinVerifyResponse(advResp);
    const pubMapped = mapPublisherResponse(advMapped.body);

    await pool.query(
      `UPDATE pin_sessions
       SET status=$1,
           advertiser_response=$2,
           publisher_response=$3,
           verified_at = CASE
             WHEN $1='SUCCESS' THEN NOW()
             ELSE verified_at
           END
       WHERE session_token=$4`,
      [
        pubMapped.status,
        advMapped.body,
        pubMapped,
        input.session_token
      ]
    );

    return {
      httpCode:advMapped.httpCode,
      body:pubMapped
    };

  } catch(err){

    console.error("VERIFY ROUTER ERROR:", err.message);

    return {
      httpCode:500,
      body:{
        status:"FAILED",
        message:err.message
      }
    };
  }
}
