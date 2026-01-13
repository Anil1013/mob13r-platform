import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * =====================================================
 * DUMP DASHBOARD (SAFE VERSION)
 * URL: /api/dashboard/dump
 * =====================================================
 */
router.get("/dashboard/dump", authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT
        ps.id AS session_id,

        o.id AS offer_id,
        o.service_name AS offer_name,
        o.geo,
        o.carrier,

        pub.id AS publisher_id,
        pub.name AS publisher_name,

        ps.msisdn,
        ps.status,

        (ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS created_ist

      FROM pin_sessions ps

      JOIN offers o
        ON o.id = ps.offer_id

      JOIN publisher_offers po
        ON po.offer_id = o.id

      JOIN publishers pub
        ON pub.id = po.publisher_id

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
