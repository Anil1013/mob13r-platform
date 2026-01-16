import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

/* RESPONSE MAPPERS */
import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";

import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;

/* ================= HELPERS ================= */
function buildRequestLog({ url, method, params, data, headers }) {
  return {
    url,
    method,
    params: params || null,
    data: data || null,
    headers: {
      "User-Agent": headers?.["user-agent"] || "",
      "Content-Type": "application/json",
      "X-Forwarded-For":
        headers?.["x-forwarded-for"] ||
        headers?.["cf-connecting-ip"] ||
        "",
      "X-Publisher-Key": headers?.["x-publisher-key"] || "",
    },
  };
}

function getAdvMethod(staticParams) {
  const m = (staticParams.method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(m)) {
    throw new Error("Invalid method (GET / POST only)");
  }
  return m;
}

/* ================= DAILY RESET ================= */
async function resetDailyHits() {
  await pool.query(`
    UPDATE offers
    SET today_hits = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE
  `);
}

/* ================= MSISDN DAILY LIMIT ================= */
async function isMsisdnLimitReached(msisdn) {
  const result = await pool.query(
    `
    SELECT COUNT(*)
    FROM pin_sessions
    WHERE msisdn = $1
      AND created_at::date = CURRENT_DATE
    `,
    [msisdn]
  );
  return Number(result.rows[0].count) >= MAX_MSISDN_DAILY;
}

/* =====================================================
   🔐 PIN SEND
===================================================== */
router.all("/pin/send/:offer_id", async (req, res) => {
  const clientIp =
    req.headers["x-forwarded-for"] ||
    req.headers["cf-connecting-ip"] ||
    req.ip;

  try {
    await resetDailyHits();

    const { offer_id } = req.params;
    const incomingParams = { ...req.query, ...req.body };
    const { msisdn } = incomingParams;

    if (!msisdn) {
      return res.status(400).json({
        status: "FAILED",
        message: "msisdn is required",
      });
    }

    if (await isMsisdnLimitReached(msisdn)) {
      return res.status(429).json({
        status: "BLOCKED",
        message: "MSISDN daily limit reached",
      });
    }

    /* FETCH OFFER */
    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND status = 'active'`,
      [offer_id]
    );

    if (!offerRes.rows.length) {
      return res.status(404).json({
        status: "FAILED",
        message: "Offer not found",
      });
    }

    const offer = offerRes.rows[0];

    /* OFFER PARAMS */
    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(
      (p) => (staticParams[p.param_key] = p.param_value)
    );

    if (!staticParams.pin_send_url) {
      return res.status(500).json({
        status: "FAILED",
        message: "pin_send_url missing",
      });
    }

    const advMethod = getAdvMethod(staticParams);

    const finalParams = {
      ...staticParams,
      ...incomingParams,
      msisdn,
      ip: clientIp,
      user_agent: req.headers["user-agent"],
    };

    const sessionToken = uuidv4();

    /* ================= SAVE INITIAL SESSION ================= */
    await pool.query(
      `
      INSERT INTO pin_sessions
      (offer_id, msisdn, session_token, params, status, publisher_request)
      VALUES ($1,$2,$3,$4,'OTP_SENT',$5)
      `,
      [
        offer.id,
        msisdn,
        sessionToken,
        finalParams,
        buildRequestLog({
          url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
          method: req.method,
          params: req.query,
          data: req.body,
          headers: req.headers,
        }),
      ]
    );

    /* ================= CALL ADVERTISER ================= */
    let advResp;
    if (advMethod === "GET") {
      advResp = await axios.get(staticParams.pin_send_url, {
        params: finalParams,
      });
    } else {
      advResp = await axios.post(staticParams.pin_send_url, finalParams);
    }

    const advData = advResp.data;

    const advMapped = mapPinSendResponse(advData);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ================= SAVE ADV + PUB ================= */
    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_request = $1,
        advertiser_response = $2,
        publisher_response = $3,
        status = $4
      WHERE session_token = $5
      `,
      [
        buildRequestLog({
          url: advResp.config.url,
          method: advResp.config.method?.toUpperCase(),
          params: advResp.config.params,
          data: advResp.config.data,
          headers: advResp.config.headers,
        }),
        advMapped.body,
        pubMapped,
        pubMapped.status,
        sessionToken,
      ]
    );

    return res.status(advMapped.httpCode).json({
      ...pubMapped,
      offer_id: offer.id,
      session_token: sessionToken,
      route: "PRIMARY",
    });
  } catch (err) {
    console.error("❌ PIN SEND ERROR:", err.message);

    return res.status(500).json({
      status: "FAILED",
      message: "PIN send failed",
    });
  }
});

/* =====================================================
   🔐 PIN VERIFY
===================================================== */
router.all("/pin/verify", async (req, res) => {
  const input = { ...req.query, ...req.body };

  try {
    const { session_token, otp } = input;

    if (!session_token || !otp) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token and otp required",
      });
    }

    const sessionRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token = $1`,
      [session_token]
    );

    if (!sessionRes.rows.length) {
      return res.status(400).json({ status: "INVALID_SESSION" });
    }

    const session = sessionRes.rows[0];

    if (session.otp_attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ status: "BLOCKED" });
    }

    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
      [session.offer_id]
    );

    const staticParams = {};
    paramRes.rows.forEach(
      (p) => (staticParams[p.param_key] = p.param_value)
    );

    const advMethod = getAdvMethod(staticParams);

    const verifyPayload = {
      ...session.params,
      otp,
      sessionKey: session.adv_session_key,
    };

    const advResp =
      advMethod === "GET"
        ? await axios.get(staticParams.verify_pin_url, {
            params: verifyPayload,
          })
        : await axios.post(staticParams.verify_pin_url, verifyPayload);

    const advMapped = mapPinVerifyResponse(advResp.data);
    const pubMapped = mapPublisherResponse(advMapped.body);

    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_request = $1,
        advertiser_response = $2,
        publisher_response = $3,
        status = $4,
        otp_attempts = otp_attempts + 1
      WHERE session_token = $5
      `,
      [
        buildRequestLog({
          url: advResp.config.url,
          method: advResp.config.method?.toUpperCase(),
          params: advResp.config.params,
          data: advResp.config.data,
          headers: advResp.config.headers,
        }),
        advMapped.body,
        pubMapped,
        pubMapped.status,
        session.session_token,
      ]
    );

    return res.status(advMapped.httpCode).json(pubMapped);
  } catch (err) {
    console.error("❌ PIN VERIFY ERROR:", err.message);
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
