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

    const offer = (
      await pool.query(
        `SELECT * FROM offers
         WHERE id=$1 AND status='active'`,
        [offer_id]
      )
    ).rows[0];

    if (!offer)
      return res.json({ status: "FAILED" });

    const sessionToken = uuidv4();

    const routes =
      await pool.query(
        `SELECT id
         FROM offer_advertiser_routes
         WHERE offer_id=$1
         AND status='active'
         ORDER BY priority ASC`,
        [offer.id]
      );

    let usedRouteId = null;
    let advertiserRequest = null;
    let advertiserResponse = null;
    let advSessionKey = null;
    let advMapped = null;
    let runtimeParams = {};

    for (const route of routes.rows) {

      let paramRes =
        await pool.query(
          `SELECT param_key,param_value
           FROM offer_route_parameters
           WHERE route_id=$1`,
          [route.id]
        );

      if (!paramRes.rows.length) {
        paramRes =
          await pool.query(
            `SELECT param_key,param_value
             FROM offer_parameters
             WHERE offer_id=$1`,
            [offer.id]
          );
      }

      const params = {};
      paramRes.rows.forEach(
        p => params[p.param_key] = p.param_value
      );

      if (!params.pin_send_url) continue;

      const method =
        (params.method || "GET").toUpperCase();

      runtimeParams = {
        ...params,
        ...incoming
      };

      advertiserRequest = {
        url: params.pin_send_url,
        method,
        params:
          method === "GET"
            ? runtimeParams
            : null,
        body:
          method === "POST"
            ? runtimeParams
            : null,
      };

      try {

        const resp =
          method === "POST"
            ? await axios.post(
                params.pin_send_url,
                runtimeParams,
                { timeout: AXIOS_TIMEOUT }
              )
            : await axios.get(
                params.pin_send_url,
                {
                  params: runtimeParams,
                  timeout: AXIOS_TIMEOUT,
                }
              );

        advertiserResponse =
          resp.data || {};

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
          e?.response?.data || {};
      }
    }

    await pool.query(
      `INSERT INTO pin_sessions
       (
        offer_id,
        msisdn,
        session_token,
        params,
        route_id,
        advertiser_request,
        advertiser_response,
        adv_session_key,
        publisher_request,
        status
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        offer.id,
        msisdn,
        sessionToken,
        runtimeParams,
        usedRouteId,
        advertiserRequest,
        advertiserResponse,
        advSessionKey,
        {
          url: req.originalUrl,
          method: req.method,
          headers: captureHeaders(req),
          params: incoming
        },
        advMapped?.isSuccess
          ? "OTP_SENT"
          : "OTP_FAILED"
      ]
    );

    const publisherResponse =
      mapPublisherResponse({
        ...(advMapped?.body || {}),
        session_token: sessionToken
      });

    await pool.query(
      `UPDATE pin_sessions
       SET publisher_response=$1
       WHERE session_token=$2`,
      [publisherResponse, sessionToken]
    );

    return res.json(publisherResponse);

  } catch (err) {
    console.error(err);
    return res.json({ status: "FAILED" });
  }
});

/* =====================================================
   ✅ PIN VERIFY (FINAL FIX)
===================================================== */

router.all("/pin/verify", async (req, res) => {
  try {

    const { session_token, otp } =
      { ...req.query, ...req.body };

    const session =
      (
        await pool.query(
          `SELECT * FROM pin_sessions
           WHERE session_token=$1`,
          [session_token]
        )
      ).rows[0];

    if (!session)
      return res.json({
        status: "INVALID_SESSION"
      });

    /* ✅ USE SAME SEND PARAMS */
    const payload = {
      ...(session.params || {}),
      otp
    };

    if (session.adv_session_key)
      payload.sessionKey =
        session.adv_session_key;

    /* ✅ LOAD SAME ROUTE VERIFY URL */
    let paramRes =
      await pool.query(
        `SELECT param_key,param_value
         FROM offer_route_parameters
         WHERE route_id=$1`,
        [session.route_id]
      );

    if (!paramRes.rows.length) {
      paramRes =
        await pool.query(
          `SELECT param_key,param_value
           FROM offer_parameters
           WHERE offer_id=$1`,
          [session.offer_id]
        );
    }

    const params = {};
    paramRes.rows.forEach(
      p => params[p.param_key] = p.param_value
    );

    const verifyUrl =
      params.verify_pin_url;

    const method =
      (params.verify_method || "GET")
        .toUpperCase();

    let advResp;

    try {
      advResp =
        method === "POST"
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
          e?.response?.data || {}
      };
    }

    const advMapped =
      mapPinVerifyResponse(
        advResp.data
      );

    const publisherResponse =
      mapPublisherResponse({
        ...advMapped.body,
        session_token
      });

    await pool.query(
      `UPDATE pin_sessions
       SET advertiser_request=$1,
           advertiser_response=$2,
           publisher_response=$3,
           status=$4,
           verified_at=NOW()
       WHERE session_token=$5`,
      [
        {
          url: verifyUrl,
          method,
          payload
        },
        advResp.data,
        publisherResponse,
        advMapped.isSuccess
          ? "VERIFIED"
          : "OTP_FAILED",
        session_token
      ]
    );

    return res.json(
      publisherResponse
    );

  } catch (err) {
    console.error(err);
    return res.json({
      status: "FAILED"
    });
  }
});

export default router;
