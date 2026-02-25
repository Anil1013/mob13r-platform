import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";

import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;
const AXIOS_TIMEOUT = 30000;

/* ================= HELPERS ================= */

function captureHeaders(req) {
  return {
    "user-agent": req.headers["user-agent"] || "",
    "x-forwarded-for": req.headers["x-forwarded-for"] || "",
  };
}

function safeSessionKey(data) {
  return (
    data?.sessionKey ||
    data?.session_key ||
    data?.transactionId ||
    null
  );
}

async function isMsisdnLimitReached(msisdn) {
  const r = await pool.query(
    `SELECT COUNT(*) FROM pin_sessions
     WHERE msisdn=$1
     AND created_at::date=CURRENT_DATE`,
    [msisdn]
  );

  return Number(r.rows[0].count) >= MAX_MSISDN_DAILY;
}

/* =====================================================
   PIN SEND (✅ FALLBACK ADDED ONLY)
===================================================== */

router.all("/pin/send/:offer_id", async (req, res) => {
  try {

    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };
    const { msisdn } = incoming;

    if (!msisdn)
      return res.status(400).json({ status: "FAILED" });

    if (await isMsisdnLimitReached(msisdn))
      return res.status(429).json({ status: "BLOCKED" });

    const offerRes = await pool.query(
      `SELECT * FROM offers
       WHERE id=$1 AND status='active'`,
      [offer_id]
    );

    if (!offerRes.rows.length)
      return res.status(404).json({ status: "FAILED" });

    const offer = offerRes.rows[0];

    /* ✅ CREATE SESSION FIRST */
    const sessionToken = uuidv4();

    await pool.query(
      `INSERT INTO pin_sessions
       (offer_id,msisdn,session_token,
        publisher_request,status)
       VALUES ($1,$2,$3,$4,'OTP_REQUESTED')`,
      [
        offer.id,
        msisdn,
        sessionToken,
        {
          url: req.originalUrl,
          method: req.method,
          headers: captureHeaders(req),
          params: incoming,
        },
      ]
    );

    /* ================= LOAD FALLBACK ROUTES ================= */

    const routesRes = await pool.query(
      `SELECT id
       FROM offer_advertiser_routes
       WHERE offer_id=$1
       AND status='active'
       ORDER BY priority ASC`,
      [offer.id]
    );

    let advMapped = null;
    let advSessionKey = null;
    let advertiserRequest = null;
    let usedRouteId = null;

    /* ================= FALLBACK LOOP ================= */

    for (const route of routesRes.rows) {

      const paramRes = await pool.query(
        `SELECT param_key,param_value
         FROM offer_route_parameters
         WHERE route_id=$1`,
        [route.id]
      );

      const params = {};
      paramRes.rows.forEach(
        p => params[p.param_key] = p.param_value
      );

      const advUrl = params.pin_send_url;
      const method =
        (params.method || "GET").toUpperCase();

      const finalParams = {
        ...params,
        ...incoming,
      };

      try {

        const resp =
          method === "POST"
            ? await axios.post(
                advUrl,
                finalParams,
                { timeout: AXIOS_TIMEOUT }
              )
            : await axios.get(advUrl, {
                params: finalParams,
                timeout: AXIOS_TIMEOUT,
              });

        advMapped =
          mapPinSendResponse(resp.data);

        advertiserRequest = {
          url: advUrl,
          method,
          params: finalParams,
        };

        advSessionKey =
          safeSessionKey(resp.data);

        if (advMapped.isSuccess) {
          usedRouteId = route.id;
          break;
        }

      } catch (e) {
        continue;
      }
    }

    /* ================= FINAL RESPONSE ================= */

    const publisherResponse =
      mapPublisherResponse({
        ...(advMapped?.body || {}),
        session_token: sessionToken,
      });

    const finalStatus =
      advMapped?.isSuccess
        ? "OTP_SENT"
        : "OTP_FAILED";

    await pool.query(
      `UPDATE pin_sessions
       SET route_id=$1,
           advertiser_request=$2,
           advertiser_response=$3,
           publisher_response=$4,
           adv_session_key=$5,
           status=$6
       WHERE session_token=$7`,
      [
        usedRouteId,
        advertiserRequest,
        advMapped?.body || null,
        publisherResponse,
        advSessionKey,
        finalStatus,
        sessionToken,
      ]
    );

    return res.json(publisherResponse);

  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   PIN VERIFY (UNCHANGED + ROUTE SAFE)
===================================================== */

router.all("/pin/verify", async (req, res) => {

  try {

    const { session_token, otp } = {
      ...req.query,
      ...req.body,
    };

    if (!session_token || !otp)
      return res.status(400).json({ status:"FAILED" });

    const sRes = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token=$1`,
      [session_token]
    );

    if (!sRes.rows.length)
      return res.json({ status:"INVALID_SESSION" });

    const session = sRes.rows[0];

    const paramRes = await pool.query(
      `SELECT param_key,param_value
       FROM offer_route_parameters
       WHERE route_id=$1`,
      [session.route_id]
    );

    const params={};
    paramRes.rows.forEach(
      p=>params[p.param_key]=p.param_value
    );

    const verifyUrl=params.verify_pin_url;

    const payload={
      ...session.params,
      otp
    };

    if(session.adv_session_key)
      payload.sessionKey=session.adv_session_key;

    let resp;

    try{
      resp=await axios.get(
        verifyUrl,
        {params:payload}
      );
    }catch(e){
      resp={data:e?.response?.data||null};
    }

    const advMapped=
      mapPinVerifyResponse(resp.data||{});

    const publisherResponse=
      mapPublisherResponse({
        ...advMapped.body,
        session_token
      });

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_response=$1,
           publisher_response=$2,
           status=$3
       WHERE session_token=$4`,
      [
        advMapped.body,
        publisherResponse,
        advMapped.isSuccess
          ?"VERIFIED"
          :"OTP_FAILED",
        session_token
      ]
    );

    return res.json(publisherResponse);

  }catch(err){
    console.error(err);
    return res.status(500).json({
      status:"FAILED"
    });
  }
});

export default router;
