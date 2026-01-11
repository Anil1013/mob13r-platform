import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * MAIN DUMP DASHBOARD
 * ADMIN / INTERNAL USE
 */
router.get("/dashboard/dump", authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;

    const whereDate = from && to
      ? `WHERE ps.created_at BETWEEN $1 AND $2`
      : "";

    const params = from && to ? [from, to] : [];

    const { rows } = await pool.query(`
      SELECT
        ps.id,
        po.id              AS offer_id,
        p.name             AS publisher_name,
        o.service_name     AS offer,
        o.geo,
        o.carrier,
        ps.msisdn,

        ps.publisher_request,
        ps.publisher_response,
        ps.advertiser_request,
        ps.advertiser_response,

        ps.status,
        ps.created_at AT TIME ZONE 'UTC'
          AT TIME ZONE 'Asia/Kolkata' AS created_ist

      FROM pin_sessions ps
      LEFT JOIN publisher_offers po ON po.id = ps.publisher_offer_id
      LEFT JOIN publishers p ON p.id = po.publisher_id
      LEFT JOIN offers o ON o.id = po.offer_id

      ${whereDate}
      ORDER BY ps.created_at DESC
    `, params);

    res.json({ rows });
  } catch (err) {
    console.error("DUMP DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load dump dashboard" });
  }
});

export default router;
