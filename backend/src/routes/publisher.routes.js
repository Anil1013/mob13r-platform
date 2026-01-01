import express from "express";
import axios from "axios";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";
import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE || "https://backend.mob13r.com";

/* =====================================================
   📤 PUBLISHER PIN SEND
   GET / POST  /api/publisher/pin/send
===================================================== */
router.all("/pin/send", publisherAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };

    const { msisdn, geo, carrier } = params;
    if (!msisdn || !geo || !carrier) {
      return res.status(400).json({
        status: "FAILED",
        message: "msisdn, geo and carrier required",
      });
    }

    /* 🔗 CALL INTERNAL PIN SEND */
    const internalResp =
      req.method === "GET"
        ? await axios.get(`${INTERNAL_API_BASE}/api/pin/send`, {
            params,
          })
        : await axios.post(`${INTERNAL_API_BASE}/api/pin/send`, params);

    /* 👉 ADV RESPONSE 그대로 publisher ko */
    return res.json(
      mapPublisherResponse(internalResp.data)
    );
  } catch (err) {
    console.error("PUBLISHER PIN SEND ERROR:", err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Publisher pin send failed",
    });
  }
});

/* =====================================================
   ✅ PUBLISHER PIN VERIFY (PASS % LOGIC HERE)
   GET / POST  /api/publisher/pin/verify
===================================================== */
router.all("/pin/verify", publisherAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const { session_token, otp } = params;

    if (!session_token || !otp) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token and otp required",
      });
    }

    /* 🔗 CALL INTERNAL VERIFY */
    const internalResp =
      req.method === "GET"
        ? await axios.get(
            `${INTERNAL_API_BASE}/api/pin/verify`,
            { params }
          )
        : await axios.post(
            `${INTERNAL_API_BASE}/api/pin/verify`,
            params
          );

    const advData = internalResp.data;

    /* ================= ADV FAILED ================= */
    if (advData.status !== "SUCCESS") {
      return res.json(
        mapPublisherResponse(advData)
      );
    }

    /* ================= PASS % LOGIC ================= */

    // 🔍 Fetch conversion + pass %
    const convRes = await pool.query(
      `
      SELECT id, pass_percent
      FROM publisher_conversions
      WHERE session_token = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [session_token]
    );

    const conversion = convRes.rows[0];
    const passPercent = Number(conversion?.pass_percent ?? 100);
    const rand = Math.random() * 100;

    /* ================= HOLD CASE ================= */
    if (rand > passPercent) {
      await pool.query(
        `
        UPDATE publisher_conversions
        SET status = 'HOLD',
            publisher_cpa = 0,
            updated_at = NOW()
        WHERE id = $1
        `,
        [conversion.id]
      );

      return res.json(
        mapPublisherResponse(advData, { isHold: true })
      );
    }

    /* ================= PASS CASE ================= */
    await pool.query(
      `
      UPDATE publisher_conversions
      SET status = 'SUCCESS',
          updated_at = NOW()
      WHERE id = $1
      `,
      [conversion.id]
    );

    return res.json(
      mapPublisherResponse(advData)
    );
  } catch (err) {
    console.error("PUBLISHER PIN VERIFY ERROR:", err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Publisher pin verify failed",
    });
  }
});

export default router;
