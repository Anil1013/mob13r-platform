import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

/* 🔥 ADV RESPONSE MAPPER */
import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const MAX_MSISDN_DAILY = 7;
const MAX_OTP_ATTEMPTS = 10;

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

/* ================= FIND FALLBACK ================= */
async function findFallbackOffer(primary) {
  const result = await pool.query(
    `
    SELECT *
    FROM offers
    WHERE advertiser_id = $1
      AND geo = $2
      AND carrier = $3
      AND service_type = 'FALLBACK'
      AND status = 'active'
      AND (daily_cap IS NULL OR today_hits < daily_cap)
    ORDER BY id ASC
    LIMIT 1
    `,
    [primary.advertiser_id, primary.geo, primary.carrier]
  );
  return result.rows[0] || null;
}

/* ================= ADV METHOD ================= */
function getAdvMethod(staticParams) {
  const m = (staticParams.method || "GET").toUpperCase();
  if (!["GET", "POST"].includes(m)) {
    throw new Error("Invalid method (GET / POST only)");
  }
  return m;
}

/* =====================================================
   🔐 PIN SEND (GET / POST)
===================================================== */
router.all("/pin/send/:offer_id", async (req, res) => {
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

    /* PRIMARY OFFER */
    const offerRes = await pool.query(
      `
      SELECT *
      FROM offers
      WHERE id = $1
        AND service_type = 'NORMAL'
        AND status = 'active'
      `,
      [offer_id]
    );

    if (!offerRes.rows.length) {
      return res.status(404).json({
        status: "FAILED",
        message: "Primary offer not found",
      });
    }

    let offer = offerRes.rows[0];
    let route = "PRIMARY";

    /* CAP CHECK */
    if (offer.daily_cap && offer.today_hits >= offer.daily_cap) {
      const fallback = await findFallbackOffer(offer);
      if (!fallback) {
        return res.status(429).json({
          status: "CAP_REACHED",
          message: "Primary cap reached, no fallback available",
        });
      }
      offer = fallback;
      route = "FALLBACK";
    }

    /* OFFER PARAMS */
    const paramRes = await pool.query(
      `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
      [offer.id]
    );

    const staticParams = {};
    paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

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
    };

    const sessionToken = uuidv4();

    await pool.query(
      `
      INSERT INTO pin_sessions
      (offer_id, msisdn, session_token, params, status)
      VALUES ($1,$2,$3,$4,'OTP_SENT')
      `,
      [offer.id, msisdn, sessionToken, finalParams]
    );

    /* CALL ADVERTISER */
    const advResp =
      advMethod === "GET"
        ? await axios.get(staticParams.pin_send_url, { params: finalParams })
        : await axios.post(staticParams.pin_send_url, finalParams);

    const advData = advResp.data;

    if (advData?.sessionKey) {
      await pool.query(
        `
        UPDATE pin_sessions
        SET adv_session_key = $1
        WHERE session_token = $2
        `,
        [advData.sessionKey, sessionToken]
      );
    }

    await pool.query(
      `UPDATE offers SET today_hits = today_hits + 1 WHERE id = $1`,
      [offer.id]
    );

    const mapped = mapPinSendResponse(advData);

    return res.status(mapped.httpCode).json({
      ...mapped.body,
      route,
      offer_id: offer.id,
      session_token: sessionToken,
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "PIN send failed",
    });
  }
});

/* =====================================================
   🔐 COMMON VERIFY HANDLER (GET + POST)
===================================================== */
async function handlePinVerify(input, res) {
  const { session_token, msisdn, offer_id, otp } = input;

  if (!otp) {
    return res.status(400).json({
      status: "FAILED",
      message: "otp is required",
    });
  }

  let sessionRes;

  if (session_token) {
    sessionRes = await pool.query(
      `SELECT * FROM pin_sessions WHERE session_token = $1`,
      [session_token]
    );
  } else if (msisdn && offer_id) {
    sessionRes = await pool.query(
      `
      SELECT *
      FROM pin_sessions
      WHERE msisdn = $1
        AND offer_id = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [msisdn, offer_id]
    );
  } else {
    return res.status(400).json({
      status: "FAILED",
      message: "session_token OR (msisdn + offer_id) required",
    });
  }

  if (!sessionRes.rows.length) {
    return res.status(400).json({
      status: "FAILED",
      message: "Invalid session",
    });
  }

  const session = sessionRes.rows[0];

  if (session.otp_attempts >= MAX_OTP_ATTEMPTS) {
    return res.status(429).json({
      status: "BLOCKED",
      message: "OTP attempts exceeded",
    });
  }

  const paramRes = await pool.query(
    `SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1`,
    [session.offer_id]
  );

  const staticParams = {};
  paramRes.rows.forEach(p => (staticParams[p.param_key] = p.param_value));

  if (!staticParams.verify_pin_url) {
    return res.status(500).json({
      status: "FAILED",
      message: "verify_pin_url missing",
    });
  }

  const advMethod = getAdvMethod(staticParams);

  const verifyPayload = {
    ...session.params,
    otp,
    sessionKey: session.adv_session_key,
  };

  const advResp =
    advMethod === "GET"
      ? await axios.get(staticParams.verify_pin_url, { params: verifyPayload })
      : await axios.post(staticParams.verify_pin_url, verifyPayload);

  const advData = advResp.data;
  const mapped = mapPinVerifyResponse(advData);

  /* ✅ SUCCESS */
  if (mapped.body.status === "SUCCESS") {
    await pool.query(
      `
      UPDATE pin_sessions
      SET status = 'VERIFIED',
          verified_at = NOW()
      WHERE session_token = $1
      `,
      [session.session_token]
    );

    /* 🔥 INSERT PUBLISHER CONVERSION (IDEMPOTENT) */
    if (session.publisher_id && session.publisher_cpa) {
      await pool.query(
        `
        INSERT INTO publisher_conversions
        (publisher_id, offer_id, pin_session_id, publisher_cpa, status)
        SELECT $1,$2,$3,$4,'SUCCESS'
        WHERE NOT EXISTS (
          SELECT 1 FROM publisher_conversions
          WHERE pin_session_id = $3
            AND status = 'SUCCESS'
        )
        `,
        [
          session.publisher_id,
          session.offer_id,
          session.id,
          session.publisher_cpa,
        ]
      );
    }
  } else {
    await pool.query(
      `
      UPDATE pin_sessions
      SET otp_attempts = otp_attempts + 1
      WHERE session_token = $1
        AND status != 'VERIFIED'
      `,
      [session.session_token]
    );
  }

  return res.status(mapped.httpCode).json(mapped.body);
}

/* ================= VERIFY ROUTES ================= */
router.post("/pin/verify", async (req, res) => {
  try {
    await handlePinVerify(req.body, res);
  } catch (err) {
    console.error("PIN VERIFY POST ERROR:", err.message);
    res.status(500).json({ status: "FAILED" });
  }
});

router.get("/pin/verify", async (req, res) => {
  try {
    await handlePinVerify(req.query, res);
  } catch (err) {
    console.error("PIN VERIFY GET ERROR:", err.message);
    res.status(500).json({ status: "FAILED" });
  }
});

/* ================= STATUS ================= */
router.get("/pin/status", async (req, res) => {
  try {
    const { session_token, msisdn } = req.query;

    let sessionRes;
    if (session_token) {
      sessionRes = await pool.query(
        `SELECT * FROM pin_sessions WHERE session_token = $1`,
        [session_token]
      );
    } else if (msisdn) {
      sessionRes = await pool.query(
        `
        SELECT *
        FROM pin_sessions
        WHERE msisdn = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [msisdn]
      );
    } else {
      return res.status(400).json({ status: "FAILED" });
    }

    if (!sessionRes.rows.length) {
      return res.json({ status: "INVALID_SESSION" });
    }

    const s = sessionRes.rows[0];

    if (s.otp_attempts >= MAX_OTP_ATTEMPTS) {
      return res.json({ status: "BLOCKED" });
    }

    if (s.status === "VERIFIED") {
      return res.json({
        status: "VERIFIED",
        verified_at: s.verified_at,
      });
    }

    return res.json({
      status: s.status || "OTP_SENT",
      otp_attempts: s.otp_attempts,
      offer_id: s.offer_id,
    });
  } catch (err) {
    res.status(500).json({ status: "FAILED" });
  }
});

/* =========================
   UPDATE OFFER (Editable Fields)
========================= */
router.patch("/:id", async (req, res) => {
  try {
    const offerId = Number(req.params.id);

    const {
      service_name,
      cpa,
      daily_cap,
      geo,
      carrier
    } = req.body;

    if (isNaN(offerId)) {
      return res.status(400).json({ message: "Invalid offer id" });
    }

    const result = await pool.query(
      `
      UPDATE offers
      SET
        service_name = COALESCE($1, service_name),
        cpa = COALESCE($2, cpa),
        daily_cap = COALESCE($3, daily_cap),
        geo = COALESCE($4, geo),
        carrier = COALESCE($5, carrier)
      WHERE id = $6
      RETURNING *
      `,
      [
        service_name,
        cpa,
        daily_cap,
        geo,
        carrier,
        offerId
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Offer not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE OFFER ERROR:", err.message);
    return res.status(500).json({ message: "Failed to update offer" });
  }
});

export default router;
