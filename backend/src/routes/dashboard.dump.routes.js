import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

import { mapPinSendResponse } from "../services/advResponseMapper.js";
import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/**
 * =====================================================
 * MAIN DUMP DASHBOARD (FINAL – MAPPER BASED)
 * URL: /api/dashboard/dump
 * =====================================================
 */
router.get("/dashboard/dump", authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT
        ps.id                AS session_id,
        ps.msisdn,
        ps.status,
        ps.created_at,

        o.id                 AS offer_id,
        o.service_name       AS offer_name,
        o.geo,
        o.carrier,

        pub.id               AS publisher_id,
        pub.name             AS publisher_name

      FROM pin_sessions ps
      JOIN offers o ON o.id = ps.offer_id
      JOIN publisher_offers po ON po.offer_id = o.id
      JOIN publishers pub ON pub.id = po.publisher_id

      ORDER BY ps.created_at DESC
      LIMIT 500;
    `;

    const { rows } = await pool.query(query);

    const mappedRows = rows.map((r) => {
      /* =================================================
         1️⃣ ADVERTISER RESPONSE (SIMULATED)
      ================================================= */
      const advInternal = {
        status: r.status === "OTP_SENT",
        raw_status: r.status,
      };

      const advMapped = mapPinSendResponse(advInternal);

      /* =================================================
         2️⃣ PUBLISHER RESPONSE (BASED ON ADV)
      ================================================= */
      const pubMapped = mapPublisherResponse(advMapped.body);

      return {
        offer_id: r.offer_id,
        offer_name: r.offer_name,
        geo: r.geo,
        carrier: r.carrier,

        publisher_id: r.publisher_id,
        publisher_name: r.publisher_name,

        msisdn: r.msisdn,
        status: r.status,

        /* ✅ RESPONSE MAPPING OUTPUT */
        advertiser_request: {
          msisdn: r.msisdn,
          offer_id: r.offer_id,
        },

        advertiser_response: advMapped.body,

        publisher_request: {
          msisdn: r.msisdn,
          offer_id: r.offer_id,
        },

        publisher_response: pubMapped,

        /* ✅ TIME (IST SAFE STRING) */
        created_ist: new Date(r.created_at).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
    });

    res.json({
      success: true,
      count: mappedRows.length,
      data: mappedRows,
    });
  } catch (err) {
    console.error("❌ Dump Dashboard Error:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
