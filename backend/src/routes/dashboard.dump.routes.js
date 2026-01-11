import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * ================================
 * MAIN DUMP DASHBOARD API
 * ================================
 * GET /api/dashboard/dump
 */
router.options("/dashboard/dump", (req, res) => {
  // 🔥 VERY IMPORTANT FOR CORS PREFLIGHT
  return res.sendStatus(204);
});

router.get(
  "/dashboard/dump",
  authMiddleware,
  async (req, res) => {
    try {
      const query = `
        SELECT
          d.offer_id,
          p.name               AS publisher_name,
          o.name               AS offer_name,
          d.geo,
          d.carrier,
          d.msisdn,

          d.publisher_request,
          d.publisher_response,
          d.advertiser_request,
          d.advertiser_response,

          d.status,

          -- 🔥 IST TIMEZONE FIX
          (d.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
            AS created_ist

        FROM dump_logs d
        LEFT JOIN publishers p ON p.id = d.publisher_id
        LEFT JOIN offers o     ON o.id = d.offer_id
        ORDER BY d.created_at DESC
        LIMIT 500;
      `;

      const { rows } = await pool.query(query);

      return res.json({
        success: true,
        count: rows.length,
        data: rows,
      });
    } catch (err) {
      console.error("❌ Dump Dashboard Error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to load dump dashboard",
      });
    }
  }
);

export default router;
