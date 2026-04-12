import express from "express";
import axios from "axios";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";
import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE || "https://backend.mob13r.com";

const AXIOS_TIMEOUT = 15000;

/* ================= HELPERS ================= */

function enrichParams(req, params) {
  return {
    ...params,
    ip:
      (req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim() || req.socket?.remoteAddress,
    user_agent: req.headers["user-agent"] || "",
  };
}

/* =====================================================
   📤 PIN SEND
===================================================== */

router.all("/pin/send", publisherAuth, async (req, res) => {
  try {
    const publisher = req.publisher;
    const base = { ...req.query, ...req.body };

    const { offer_id, msisdn } = base;

    if (!offer_id || !msisdn) {
      return res.status(400).json({
        status: "FAILED",
        message: "offer_id and msisdn required",
      });
    }

    const params = enrichParams(req, base);

    const internal = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/send/${offer_id}`,
      timeout: AXIOS_TIMEOUT,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });

    const data = internal.data;

    if (data?.session_token) {
      await pool.query(
        `UPDATE pin_sessions
         SET publisher_id = $1
         WHERE session_token = $2`,
        [publisher.id, data.session_token]
      );
    }

    return res.json(mapPublisherResponse(data));
  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   ✅ PIN VERIFY (FINAL FIXED)
===================================================== */

router.all("/pin/verify", publisherAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const publisher = req.publisher;
    const params = enrichParams(req, { ...req.query, ...req.body });

    const inputToken =
      params.session_token ||
      params.sessionKey ||
      params.session_key;

    if (!inputToken) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token required",
      });
    }

    /* CALL ADVERTISER */
    const advResp = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/verify`,
      timeout: AXIOS_TIMEOUT,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });

    let advData = advResp.data;

    /* 🔥 TEST OTP FORCE SUCCESS */
    if (params.otp === "1013") {
      advData.status = "SUCCESS";
      advData.response = "SUCCESS";
    }

    const isSuccess =
      advData?.status === "SUCCESS" ||
      advData?.response === "SUCCESS" ||
      advData?.verified === true;

    if (!isSuccess) {
      return res.json(mapPublisherResponse(advData));
    }

    await client.query("BEGIN");

    /* 🔥 GET VERIFIED ROW (IMPORTANT FIX) */
    const verifiedRes = await client.query(
      `SELECT *
       FROM pin_sessions
       WHERE parent_session_token::text = $1
          OR session_token::text = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [inputToken]
    );

    if (!verifiedRes.rows.length) {
      await client.query("ROLLBACK");
      return res.json(mapPublisherResponse(advData));
    }

    const row = verifiedRes.rows[0];

    if (row.publisher_id !== publisher.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({ status: "FORBIDDEN" });
    }

    /* 🔥 FINAL CREDIT FIX (DIRECT ROW UPDATE) */
    await client.query(
      `UPDATE pin_sessions
       SET publisher_credited = TRUE,
           credited_at = NOW(),
           status = 'VERIFIED'
       WHERE session_id = $1`,
      [row.session_id]
    );

    await client.query("COMMIT");

    return res.json(mapPublisherResponse(advData));

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  } finally {
    client.release();
  }
});

export default router;
