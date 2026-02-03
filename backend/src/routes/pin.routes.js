import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";

const router = express.Router();

/* ================= UTIL ================= */

const buildUrl = (base, params) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.append(k, v);
  });
  return `${base}?${qs.toString()}`;
};

const getAdvMethod = (p) =>
  (p.method || "GET").toUpperCase() === "POST" ? "POST" : "GET";

/* =====================================================
   🔐 PIN SEND
===================================================== */
router.all("/pin/send/:offer_id", async (req, res) => {
  const { offer_id } = req.params;
  const incoming = { ...req.query, ...req.body };

  const { msisdn, geo, carrier, user_agent, ip } = incoming;
  if (!msisdn) {
    return res.status(400).json({ status: "FAILED", message: "msisdn required" });
  }

  /* OFFER */
  const offerRes = await pool.query(`SELECT * FROM offers WHERE id=$1`, [
    offer_id,
  ]);
  if (!offerRes.rows.length) {
    return res.status(404).json({ status: "FAILED", message: "Offer not found" });
  }
  const offer = offerRes.rows[0];

  /* PARAMS */
  const paramRes = await pool.query(
    `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
    [offer.id]
  );
  const staticParams = {};
  paramRes.rows.forEach((p) => (staticParams[p.param_key] = p.param_value));

  const sessionToken = uuidv4();

  /* 🔹 SAVE PUBLISHER REQUEST */
  const publisherReq = {
    url: buildUrl(
      `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      incoming
    ),
    method: req.method,
    headers: req.headers,
    params: incoming,
  };

  await pool.query(
    `
    INSERT INTO pin_sessions
    (offer_id, msisdn, session_token, params, publisher_request, status)
    VALUES ($1,$2,$3,$4,$5,'OTP_SENT')
    `,
    [offer.id, msisdn, sessionToken, incoming, publisherReq]
  );

  /* 🔹 ADVERTISER PIN SEND */
  const advParams = {
    cid: staticParams.cid,
    msisdn,
    pub_id: staticParams.pub_id,
    sub_pub_id: staticParams.sub_pub_id,
    user_ip: ip,
    ua: user_agent,
    geo,
    carrier,
  };

  const advUrl = staticParams.pin_send_url;
  const advMethod = getAdvMethod(staticParams);

  const advertiserReq = {
    url: buildUrl(advUrl, advParams),
    method: advMethod,
    headers: { "Content-Type": "application/json" },
  };

  let advRaw;
  try {
    advRaw =
      advMethod === "GET"
        ? (await axios.get(advertiserReq.url)).data
        : (await axios.post(advUrl, advParams)).data;
  } catch (e) {
    advRaw = e.response?.data || null;
  }

  const advMapped = mapPinSendResponse(advRaw);

  await pool.query(
    `
    UPDATE pin_sessions
    SET advertiser_request=$1,
        advertiser_response=$2,
        publisher_response=$3,
        status=$4
    WHERE session_token=$5
    `,
    [
      advertiserReq,
      advMapped.body,
      advMapped.body,
      advMapped.body.status,
      sessionToken,
    ]
  );

  return res.status(advMapped.httpCode).json({
    ...advMapped.body,
    session_token: sessionToken,
    offer_id: offer.id,
  });
});

/* =====================================================
   🔐 PIN VERIFY
===================================================== */
router.all("/pin/verify", async (req, res) => {
  const { session_token, otp } = { ...req.query, ...req.body };
  if (!session_token || !otp) {
    return res.status(400).json({ status: "FAILED", message: "Invalid input" });
  }

  const sRes = await pool.query(
    `SELECT * FROM pin_sessions WHERE session_token=$1`,
    [session_token]
  );
  if (!sRes.rows.length) {
    return res.json({ status: "INVALID_SESSION" });
  }
  const s = sRes.rows[0];

  const paramRes = await pool.query(
    `SELECT param_key,param_value FROM offer_parameters WHERE offer_id=$1`,
    [s.offer_id]
  );
  const staticParams = {};
  paramRes.rows.forEach((p) => (staticParams[p.param_key] = p.param_value));

  const verifyParams = {
    cid: staticParams.cid,
    msisdn: s.msisdn,
    otp,
    sessionKey: s.adv_session_key,
  };

  const verifyUrl = staticParams.verify_pin_url;
  const advReq = {
    url: buildUrl(verifyUrl, verifyParams),
    method: "GET",
    headers: { "Content-Type": "application/json" },
  };

  let advRaw;
  try {
    advRaw = (await axios.get(advReq.url)).data;
  } catch (e) {
    advRaw = e.response?.data || null;
  }

  const mapped = mapPinVerifyResponse(advRaw);

  await pool.query(
    `
    UPDATE pin_sessions
    SET advertiser_request=$1,
        advertiser_response=$2,
        publisher_response=$3,
        status=$4,
        verified_at = CASE WHEN $4='SUCCESS' THEN NOW() ELSE verified_at END
    WHERE session_token=$5
    `,
    [advReq, mapped.body, mapped.body, mapped.body.status, session_token]
  );

  return res.status(mapped.httpCode).json(mapped.body);
});

export default router;
