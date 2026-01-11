import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =========================================================
   MAIN DUMP DASHBOARD (ADMIN / INTERNAL)
   - Uses ONLY mapped responses
   - Timezone: IST (Asia/Kolkata)
   ========================================================= */

/**
 * GET /api/dashboard/dump
 *
 * Optional query params:
 *  ?from=YYYY-MM-DD
 *  ?to=YYYY-MM-DD
 */
router.get("/dashboard/dump", authMiddleware, async (req, res) => {
  try {
    let { from, to } = req.query;

    let whereClause = "";
    let params = [];

    /* ---------- DATE FILTER (IST) ---------- */
    if (from && to) {
      // Convert IST date range → UTC timestamps
      const fromUTC = new Date(`${from}T00:00:00+05:30`).toISOString();
      const toUTC = new Date(`${to}T23:59:59.999+05:30`).toISOString();

      whereClause = `WHERE ps.created_at BETWEEN $1 AND $2`;
      params = [fromUTC, toUTC];
    }

    const query = `
      SELECT
        ps.id,

        po.id AS offer_id,
        p.name AS publisher_name,
        o.service_name AS offer_name,
        o.geo,
        o.carrier,

        ps.msisdn,

        ps.publisher_request,
        ps.publisher_response,
        ps.advertiser_request,
        ps.advertiser_response,

        ps.status,

        -- ✅ IST TIME FOR FRONTEND
        ps.created_at AT TIME ZONE 'UTC'
          AT TIME ZONE 'Asia/Kolkata' AS created_ist

      FROM pin_sessions ps
      LEFT JOIN publisher_offers po ON po.id = ps.publisher_offer_id
      LEFT JOIN publishers p ON p.id = po.publisher_id
      LEFT JOIN offers o ON o.id = po.offer_id

      ${whereClause}

      ORDER BY ps.created_at DESC
      LIMIT 5000
    `;

    const { rows } = await pool.query(query, params);

    res.json({
      timezone: "Asia/Kolkata",
      count: rows.length,
      rows,
    });
  } catch (err) {
    console.error("❌ DUMP DASHBOARD ERROR:", err);
    res.status(500).json({
      error: "Failed to load dump dashboard",
    });
  }
});

export default router;
