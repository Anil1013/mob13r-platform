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
   HELPERS
===================================================== */

function buildFullUrl(baseUrl, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

function getHeaders(req) {
  return {
    "User-Agent": req.headers["user-agent"] || "",
    "Content-Type": "application/json",
    "X-Forwarded-For": req.headers["x-forwarded-for"] || req.ip || "",
    "X-Publisher-Key": req.headers["x-publisher-key"] || "",
  };
}

/* =====================================================
   🔐 PIN SEND
===================================================== */
router.all("/pin/send/:offer_id", async (req, res) => {
  const client = await pool.connect();

  try {
    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };
    const { msisdn } = incoming;

    if (!msisdn) {
      return res.status(400).json({ status: "FAILED", message: "msisdn required" });
    }

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND status = 'active'`,
      [offer_id]
    );
    if (!offerRes.rows.length) {
      return res.status(404).json({ status: "FAILED", message: "Offer not found" });
    }
    const offer = offerRes.rows[0];

    /* OFFER PARAMS */
    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

    if (!staticParams.pin_send_url) {
      return res.status(500).json({ status: "FAILED", message: "pin_send_url missing" });
    }

    const sessionToken = uuidv4();

    /* ================= PUBLISHER REQUEST ================= */
    const publisherRequest = {
      url: buildFullUrl(req.originalUrl, incoming),
      method: req.method,
      headers: getHeaders(req),
      params: incoming,
      body: req.body || null,
    };

    await pool.query(
      `
      INSERT INTO pin_sessions
        (offer_id, msisdn, session_token, publisher_request, status)
      VALUES
        ($1,$2,$3,$4,'OTP_SENT')
      `,
      [offer.id, msisdn, sessionToken, publisherRequest]
    );

    /* ================= ADVERTISER REQUEST ================= */
    const advParams = {
      ...staticParams,
      ...incoming,
      msisdn,
    };

    const advUrl = buildFullUrl(staticParams.pin_send_url, advParams);

    const advertiserRequest = {
      url: advUrl,
      method: "GET",
      headers: { "Content-Type": "application/json" },
      data: null,
    };

    let advResp;
    try {
      advResp = await axios.get(staticParams.pin_send_url, { params: advParams });
    } catch (e) {
      advResp = { data: e.response?.data || null };
    }

    const advMapped = mapPinSendResponse(advResp.data);
    const pubMapped = mapPublisherResponse(advMapped.body);

    /* ================= SAVE RESPONSES ================= */
    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_request  = $1,
        advertiser_response = $2,
        publisher_response  = $3,
        status              = $4
      WHERE session_token = $5
      `,
      [
        advertiserRequest,
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
    console.error("PIN SEND ERROR:", err);
    return res.status(500).json({ status: "FAILED", message: "PIN send failed" });
  } finally {
    client.release();
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
      return res.status(400).json({ status: "FAILED", message: "session_token & otp required" });
    }

    const sessionRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token = $1`,
      [session_token]
    );
    if (!sessionRes.rows.length) {
      return res.status(400).json({ status: "FAILED", message: "Invalid session" });
    }

    const session = sessionRes.rows[0];

    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
      [session.offer_id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

    if (!staticParams.verify_pin_url) {
      return res.status(500).json({ status: "FAILED", message: "verify_pin_url missing" });
    }

    /* ================= ADVERTISER VERIFY REQUEST ================= */
    const verifyParams = {
      ...session.publisher_request?.params,
      otp,
      sessionKey: session.adv_session_key,
    };

    const advVerifyUrl = buildFullUrl(staticParams.verify_pin_url, verifyParams);

    const advertiserRequest = {
      url: advVerifyUrl,
      method: "GET",
      headers: { "Content-Type": "application/json" },
      data: null,
    };

    let advResp;
    try {
      advResp = await axios.get(staticParams.verify_pin_url, { params: verifyParams });
    } catch (e) {
      advResp = { data: e.response?.data || null };
    }

    const advMapped = mapPinVerifyResponse(advResp.data);
    const pubMapped = mapPublisherResponse(advMapped.body);

    await pool.query(
      `
      UPDATE pin_sessions
      SET
        advertiser_request  = $1,
        advertiser_response = $2,
        publisher_response  = $3,
        status              = $4,
        verified_at         = CASE WHEN $4 = 'SUCCESS' THEN NOW() ELSE verified_at END
      WHERE session_token = $5
      `,
      [
        advertiserRequest,
        advMapped.body,
        pubMapped,
        pubMapped.status,
        session_token,
      ]
    );

    return res.status(advMapped.httpCode).json(pubMapped);

  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
