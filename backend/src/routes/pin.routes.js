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

/* =====================================================
   CONFIG
===================================================== */

const MAX_MSISDN_DAILY = 7;
const AXIOS_TIMEOUT = 30000;

/* =====================================================
   HELPERS
===================================================== */

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
    data?.txnId ||
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
   ✅ PIN SEND (FALLBACK ENGINE)
===================================================== */

router.all("/pin/send/:offer_id", async (req, res) => {
  try {

    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };
    const { msisdn } = incoming;

    if (!msisdn)
      return res.json({ status: "FAILED" });

    if (await isMsisdnLimitReached(msisdn))
      return res.json({ status: "BLOCKED" });

    const offerRes = await pool.query(
      `SELECT * FROM offers
       WHERE id=$1 AND status='active'`,
      [offer_id]
    );

    if (!offerRes.rows.length)
      return res.json({ status: "FAILED" });

    const offer = offerRes.rows[0];

    const sessionToken = uuidv4();

    /* ✅ ROUTES LOAD */
    const routesRes = await pool.query(
      `SELECT id
       FROM offer_advertiser_routes
       WHERE offer_id=$1
       AND status='active'
       ORDER BY priority ASC`,
      [offer.id]
    );

    let advertiserRequest = null;
    let advertiserResponse = null;
    let advMapped = null;
    let advSessionKey = null;
    let usedRouteId = null;
    let finalParams = {};

    /* ================= FALLBACK LOOP ================= */

    for (const route of routesRes.rows) {

      let paramRes = await pool.query(
        `SELECT param_key,param_value
         FROM offer_route_parameters
         WHERE route_id=$1`,
        [route.id]
      );

      if (!paramRes.rows.length) {
        paramRes = await pool.query(
          `SELECT param_key,param_value
           FROM offer_parameters
           WHERE offer_id=$1`,
          [offer.id]
        );
      }

      const params = {};
      paramRes.rows.forEach(
        p => (params[p.param_key] = p.param_value)
      );

      const advUrl = params.pin_send_url;
      if (!advUrl) continue;

      const method =
        (params.method || "GET").toUpperCase();

      finalParams = {
        ...params,
        ...incoming,
      };

      advertiserRequest = {
        url: advUrl,
        method,
        params:
          method === "GET" ? finalParams : null,
        body:
          method === "POST" ? finalParams : null,
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

        advertiserResponse = resp.data || {};

        advMapped =
          mapPinSendResponse(
            advertiserResponse
          );

        advSessionKey =
          safeSessionKey(
            advertiserResponse
          );

        if (advMapped.isSuccess) {
          usedRouteId = route.id;
          break;
        }

      } catch (e) {
        advertiserResponse =
          e?.response?.data || {
            error: "request_failed",
          };
      }
    }

    /* ✅ CREATE SESSION AFTER ROUTE SUCCESS */
    await pool.query(
      `INSERT INTO pin_sessions
       (
         offer_id,
         msisdn,
         session_token,
         params,
         route_id,
         publisher_request,
         advertiser_request,
         advertiser_response,
         adv_session_key,
         status
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        offer.id,
        msisdn,
        sessionToken,
        finalParams,
        usedRouteId,
        {
          url: req.originalUrl,
          method: req.method,
          headers: captureHeaders(req),
          params: incoming,
        },
        advertiserRequest,
        advertiserResponse,
        advSessionKey,
        advMapped?.isSuccess
          ? "OTP_SENT"
          : "OTP_FAILED",
      ]
    );

    const publisherResponse =
      mapPublisherResponse({
        ...(advMapped?.body || {}),
        session_token: sessionToken,
      });

    await pool.query(
      `UPDATE pin_sessions
       SET publisher_response=$1
       WHERE session_token=$2`,
      [publisherResponse, sessionToken]
    );

    return res.json(publisherResponse);

  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res.json({ status: "FAILED" });
  }
});

/* =====================================================
   ✅ PIN VERIFY (ROUTE LOCKED FIX)
===================================================== */

router.all("/pin/verify", async (req, res) => {
  try {

    const { session_token, otp } = {
      ...req.query,
      ...req.body,
    };

    if (!session_token || !otp)
      return res.json({
        status: "FAILED",
        message: "Missing params",
      });

    const sRes = await pool.query(
      `SELECT * FROM pin_sessions
       WHERE session_token=$1`,
      [session_token]
    );

    if (!sRes.rows.length)
      return res.json({
        status: "INVALID_SESSION",
      });

    const session = sRes.rows[0];

    /* ✅ LOAD SAME ROUTE PARAMS */
    let paramRes;

    if (session.route_id) {
      paramRes = await pool.query(
        `SELECT param_key,param_value
         FROM offer_route_parameters
         WHERE route_id=$1`,
        [session.route_id]
      );
    }

    if (!paramRes.rows.length) {
      paramRes = await pool.query(
        `SELECT param_key,param_value
         FROM offer_parameters
         WHERE offer_id=$1`,
        [session.offer_id]
      );
    }

    const params = {};
    paramRes.rows.forEach(
      p => (params[p.param_key] = p.param_value)
    );

    const verifyUrl =
      params.verify_pin_url;

    const verifyMethod =
      (params.verify_method || "GET")
        .toUpperCase();

    const payload = {
      ...session.params,
      otp,
    };

    if (session.adv_session_key)
      payload.sessionKey =
        session.adv_session_key;

    let advResp;

    try {
      advResp =
        verifyMethod === "POST"
          ? await axios.post(
              verifyUrl,
              payload
            )
          : await axios.get(
              verifyUrl,
              { params: payload }
            );
    } catch (e) {
      advResp = {
        data:
          e?.response?.data || null,
      };
    }

    const advData =
      advResp?.data || {};

    const advMapped =
      mapPinVerifyResponse(
        advData
      );

    const publisherResponse =
      mapPublisherResponse({
        ...advMapped.body,
        session_token,
      });

    const verifyStatus =
      advMapped.isSuccess
        ? "VERIFIED"
        : "OTP_FAILED";

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_request=$1,
           advertiser_response=$2,
           publisher_response=$3,
           status=$4,
           verified_at =
             CASE WHEN $4='VERIFIED'
             THEN NOW()
             ELSE verified_at END
       WHERE session_token=$5`,
      [
        {
          url: verifyUrl,
          method: verifyMethod,
          params:
            verifyMethod === "GET"
              ? payload
              : null,
          body:
            verifyMethod === "POST"
              ? payload
              : null,
        },
        advData,
        publisherResponse,
        verifyStatus,
        session_token,
      ]
    );

    return res.json(
      publisherResponse
    );

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.json({
      status: "FAILED",
    });
  }
});

export default router;
