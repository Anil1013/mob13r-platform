import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/**
 * =========================================================
 * MAIN DUMP DASHBOARD
 * URL: GET /api/dashboard/dump
 * AUTH: ADMIN (JWT)
 * TIMEZONE: IST
 * =========================================================
 */
router.get(
  "/dashboard/dump",
  authMiddleware,
  async (req, res) => {
    try {
      const query = `
        SELECT
          ps.id AS session_id,

          -- Offer
          o.id AS offer_id,
          o.service_name AS offer_name,
          o.geo,
          o.carrier,

          -- Publisher
          pub.id AS publisher_id,
          pub.name AS publisher_name,

          -- MSISDN
          ps.msisdn,

          -- Requests / Responses
          ps.publisher_request,
          ps.publisher_response,
          ps.advertiser_request,
          ps.advertiser_response,

          -- Status
          ps.status,

          -- IST Time
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
    } catch (error) {
      console.error("❌ Dump Dashboard Error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to load dump dashboard",
      });
    }
  }
);

export default router;
