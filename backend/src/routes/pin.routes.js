import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;

/* ================= HELPERS ================= */
function buildFinalUrl(baseUrl, params = {}) {
  const clean = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && !String(v).includes("{")) {
      clean[k] = v;
    }
  });
  const qs = new URLSearchParams(clean).toString();
  return qs ? `${baseUrl}?${qs}` : baseUrl;
}

function getMethod(staticParams) {
  const m = (staticParams.method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(m)) {
    throw new Error("Invalid HTTP method");
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

async function isMsisdnLimitReached(msisdn) {
  const r = await pool.query(
    `
    SELECT COUNT(*)
    FROM pin_sessions
    WHERE msisdn = $1
      AND created_at::date = CURRENT_DATE
    `,
    [msisdn]
  );
  return Number(r.rows[0].count) >= MAX_MSISDN_DAILY;
}

/* =====================================================
   🔐 PIN SEND
===================================================== */
router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    await resetDailyHits();

    const { offer_id } = req.params;
    const incoming = { ...req.query, ...req.body };
    const { msisdn, geo, carrier } = incoming;

    if (!msisdn) {
      return res.status(400).json({ status: "FAILED", message: "msisdn required" });
    }

    if (await isMsisdnLimitReached(msisdn)) {
      return res.status(429).json({ status: "BLOCKED", message: "MSISDN limit" });
    }

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id = $1 AND status = 'active'`,
      [offer_id]
    );
    if (!offerRes.rows.length) {
      return res.status(404).json({ status: "FAILED", message: "Offer not found" });
    }
    const offer = offerRes.rows[0];

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

    const publisherParams = {
      msisdn,
      geo,
      carrier,
      ip: req.ip,
      user_agent: req.headers["user-agent"],
    };

    const publisherRequest = {
      url: buildFinalUrl(
        `${req.protocol}://${req.get("host")}/api/pin/send/${offer.id}`,
        publisherParams
      ),
      body: null,
      method: "GET",
      params: publisherParams,
      headers: {
        "User-Agent": req.headers["user-agent"] || "",
        "Content-Type": "application/json",
        "X-Forwarded-For": req.headers["x-forwarded-for"] || "",
        "X-Publisher-Key": req.headers["x-publisher-key"] || "",
      },
    };

    await pool.query(
      `
      INSERT INTO pin_sessions
      (offer_id, msisdn, session_token, params, status, publisher_request)
      VALUES ($1,$2,$3,$4,'OTP_SENT',$5)
      `,
      [offer.id, msisdn, sessionToken, publisherParams, publisherRequest]
    );

    /* -------- ADVERTISER PIN SEND -------- */
    const advParams = {
      cid: staticParams.cid,
      msisdn,
      user_ip: req.ip,
      ua: req.headers["user-agent"],
      pub_id: staticParams.pub_id,
      sub_pub_id: staticParams.sub_pub_id,
    };

    const advUrl = buildFinalUrl(staticParams.pin_send_url, advParams);

    const advertiserRequest = {
      url: advUrl,
      data: null,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const advResp = await axios.get(advUrl, {
      headers: advertiserRequest.headers,
    });

    const advMapped = mapPinSendResponse(advResp.data);

    await pool.query(
      `
      UPDATE pin_sessions
      SET advertiser_request = $1,
          advertiser_response = $2,
          status = $3
      WHERE session_token = $4
      `,
      [advertiserRequest, advMapped.body, advMapped.body.status, sessionToken]
    );

    return res.status(advMapped.httpCode).json({
      ...advMapped.body,
      offer_id: offer.id,
      session_token: sessionToken,
      route: "PRIMARY",
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   🔐 PIN VERIFY
===================================================== */
router.all("/pin/verify", async (req, res) => {
  try {
    const { session_token, otp } = { ...req.query, ...req.body };
    if (!otp || !session_token) {
      return res.status(400).json({ status: "FAILED", message: "otp + session_token required" });
    }

    const sRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token = $1`,
      [session_token]
    );
    if (!sRes.rows.length) {
      return res.status(400).json({ status: "FAILED", message: "Invalid session" });
    }
    const session = sRes.rows[0];

    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
      [session.offer_id]
    );
    const staticParams = {};
    paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

    const verifyParams = {
      cid: staticParams.cid,
      msisdn: session.msisdn,
      otp,
      user_ip: req.ip,
      ua: req.headers["user-agent"],
      pub_id: staticParams.pub_id,
      sub_pub_id: staticParams.sub_pub_id,
    };

    const advVerifyUrl = buildFinalUrl(staticParams.verify_pin_url, verifyParams);

    const advertiserRequest = {
      url: advVerifyUrl,
      data: null,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const advResp = await axios.get(advVerifyUrl, {
      headers: advertiserRequest.headers,
    });

    const mapped = mapPinVerifyResponse(advResp.data);

    await pool.query(
      `
      UPDATE pin_sessions
      SET advertiser_request = $1,
          advertiser_response = $2,
          status = $3
      WHERE session_token = $4
      `,
      [advertiserRequest, mapped.body, mapped.body.status, session.session_token]
    );

    return res.status(mapped.httpCode).json(mapped.body);
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
