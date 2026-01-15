import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * =====================================================
 * MAIN DUMP DASHBOARD – FINAL (REAL SCHEMA BASED)
 * =====================================================
 */
router.get("/dashboard/dump", authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT
        ps.session_id,
        ps.session_token,

        o.id            AS offer_id,
        o.service_name  AS offer_name,
        o.geo,
        o.carrier,

        pub.id          AS publisher_id,
        pub.name        AS publisher_name,

        ps.msisdn,

        ps.runtime_params       AS publisher_request,
        ps.publisher_response,

        ps.params               AS advertiser_request,
        ps.advertiser_response,

        ps.status,
        ps.created_at           -- ✅ PURE UTC

      FROM pin_sessions ps
      JOIN offers o ON o.id = ps.offer_id
      JOIN publishers pub ON pub.id = ps.publisher_id

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
    res.status(500).json({ success: false });
  }
});

export default router;
