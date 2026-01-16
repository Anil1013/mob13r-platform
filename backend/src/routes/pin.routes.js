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

/* ================= HELPERS ================= */

function buildQueryUrl(baseUrl, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return `${baseUrl}?${qs}`;
}

function pickHeaders(req) {
  return {
    "User-Agent": req.headers["user-agent"] || "",
    "X-Forwarded-For": req.headers["x-forwarded-for"] || req.ip,
    "Content-Type": "application/json",
    "X-Publisher-Key": req.headers["x-publisher-key"] || "",
  };
}

/* =====================================================
   🔐 PIN SEND
===================================================== */
router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    const { offer_id } = req.params;
    const incomingParams = { ...req.query, ...req.body };
    const { msisdn } = incomingParams;

    if (!msisdn) {
      return res.status(400).json({ status: "FAILED", message: "msisdn required" });
    }

    /* ---------- OFFER ---------- */
    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND status = 'active'`,
      [offer_id]
    );
    if (!offerRes.rows.length) {
      return res.status(404).json({ status: "FAILED", message: "Offer not found" });
    }
    const offer = offerRes.rows[0];

    /* ---------- OFFER PARAMS ---------- */
    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

    const sessionToken = uuidv4();

    /* ---------- PUBLISHER REQUEST (SAVE) ---------- */
    const publisherRequest = {
      url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      method: req.method,
      params: incomingParams,
      headers: pickHeaders(req),
      body: req.body || null,
    };

    /* ---------- BUILD ADV SEND URL ---------- */
    const advParams = {
      ...staticParams,
      ...incomingParams,
      msisdn,
    };

    const advUrl = buildQueryUrl(staticParams.pin_send_url, advParams);

    const advertiserRequest = {
      url: advUrl,
      method: "GET",
      data: null,
      headers: { "Content-Type": "application/json" },
    };

    /* ---------- CREATE SESSION ---------- */
    await pool.query(
      `
      INSERT INTO pin_sessions
      (offer_id, msisdn, session_token, status,
       publisher_request, advertiser_request)
      VALUES ($1,$2,$3,'INIT',$4,$5)
      `,
      [
        offer.id,
        msisdn,
        sessionToken,
        publisherRequest,
        advertiserRequest,
      ]
    );

    /* ---------- CALL ADVERTISER ---------- */
    const advResp = await axios.get(advUrl);
    const advData = advResp.data;

    const advMapped = mapPinSendResponse(advData);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ---------- SAVE RESPONSES ---------- */
    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_response = $1,
        publisher_response  = $2,
        status = $3
      WHERE session_token = $4
      `,
      [
        advData,
        pubMapped,
        pubMapped.status,
        sessionToken,
      ]
    );

    return res.status(advMapped.httpCode).json({
      ...pubMapped,
      session_token: sessionToken,
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err.message);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   🔐 PIN VERIFY
===================================================== */
router.all("/pin/verify", async (req, res) => {
  try {
    const input = { ...req.query, ...req.body };
    const { session_token, otp } = input;

    if (!session_token || !otp) {
      return res.status(400).json({ status: "FAILED", message: "missing params" });
    }

    const sessionRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token = $1`,
      [session_token]
    );
    if (!sessionRes.rows.length) {
      return res.status(400).json({ status: "FAILED", message: "Invalid session" });
    }

    const session = sessionRes.rows[0];

    /* ❌ BLOCK VERIFY IF SEND FAILED */
    if (session.status === "SEND_FAILED") {
      return res.status(400).json({
        status: "FAILED",
        message: "OTP not sent, verification blocked",
      });
    }

    /* ---------- BUILD VERIFY URL ---------- */
    const advParams = {
      ...session.params,
      otp,
      sessionKey: session.adv_session_key,
    };

    const advUrl = buildQueryUrl(session.verify_pin_url, advParams);

    const advertiserRequest = {
      url: advUrl,
      method: "GET",
      data: null,
      headers: { "Content-Type": "application/json" },
    };

    /* ---------- CALL ADVERTISER ---------- */
    const advResp = await axios.get(advUrl);
    const advData = advResp.data;

    const advMapped = mapPinVerifyResponse(advData);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ---------- SAVE ---------- */
    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_request  = $1,
        advertiser_response = $2,
        publisher_response  = $3,
        status = $4
      WHERE session_token = $5
      `,
      [
        advertiserRequest,
        advData,
        pubMapped,
        pubMapped.status,
        session_token,
      ]
    );

    return res.status(advMapped.httpCode).json(pubMapped);
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err.message);
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
