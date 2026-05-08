import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * =====================================================
 * MAIN DUMP DASHBOARD (FINAL – CLEAN & CORRECT)
 * URL: /api/dashboard/dump
 * =====================================================
 */
router.get("/dashboard/dump", authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT
        ps.session_id,

        /* OFFER */
        o.id                AS offer_id,
        o.service_name      AS offer_name,
        o.geo,
        o.carrier,

        /* PUBLISHER */
        pub.id              AS publisher_id,
        pub.name            AS publisher_name,

        /* ADVERTISER */
        adv.id              AS advertiser_id,
        adv.name            AS advertiser_name,

        /* SESSION */
        ps.msisdn,
        ps.status,

        ps.publisher_request,
        ps.publisher_response,
        ps.advertiser_request,
        ps.advertiser_response,

        /* ✅ FINAL IST TIME (STRING SAFE) */
        to_char(
          ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata',
          'DD/MM/YYYY, HH12:MI:SS AM'
        ) AS created_ist

      FROM pin_sessions ps

      /* OFFER */
      JOIN offers o
        ON o.id = ps.offer_id

      /* PUBLISHER (from session, not via publisher_offers) */
      LEFT JOIN publishers pub
        ON pub.id = ps.publisher_id

      /* ADVERTISER */
      LEFT JOIN advertisers adv
        ON adv.id = o.advertiser_id

      ORDER BY ps.created_at DESC
      LIMIT 500;
    `;

    const { rows } = await pool.query(query);

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("❌ Dump Dashboard Error:", err);
    res.status(500).json({
      success: false,
      message: "Dump dashboard failed",
    });
  }
});

export default router;
