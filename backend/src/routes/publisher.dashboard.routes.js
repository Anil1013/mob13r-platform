import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/**
 * GET /api/publisher/dashboard/offers
 * Publisher Dashboard Data
 */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id; // from publisherAuth

    const query = `
      SELECT
        po.id AS publisher_offer_id,
        o.service_name AS offer,
        o.geo,
        o.carrier,
        po.publisher_cpa AS cpa,
        po.daily_cap AS cap,

        COUNT(ps.session_id) AS pin_request_count,
        COUNT(DISTINCT ps.msisdn) AS unique_pin_request_count,

        COUNT(*) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        ) AS pin_send_count,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        ) AS unique_pin_sent,

        COUNT(*) FILTER (
          WHERE ps.otp_attempts > 0
        ) AS pin_validation_request_count,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.otp_attempts > 0
        ) AS unique_pin_validation_request_count,

        COUNT(DISTINCT pc.pin_session_uuid) AS unique_pin_verified,

        ROUND(
          COUNT(DISTINCT pc.pin_session_uuid)::numeric /
          NULLIF(
            COUNT(DISTINCT ps.msisdn)
              FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED')),
            0
          ) * 100,
          2
        ) AS cr,

        COALESCE(SUM(pc.publisher_cpa), 0) AS revenue,

        MAX(ps.created_at) AS last_pin_gen_date,
        MAX(ps.created_at) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        ) AS last_pin_gen_success_date,
        MAX(ps.verified_at) AS last_pin_verification_date,
        MAX(ps.credited_at) FILTER (
          WHERE ps.publisher_credited = TRUE
        ) AS last_success_pin_verification_date

      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      LEFT JOIN pin_sessions ps
        ON ps.publisher_offer_id = po.id
      LEFT JOIN publisher_conversions pc
        ON pc.pin_session_uuid = ps.session_id
       AND pc.status = 'SUCCESS'

      WHERE po.publisher_id = $1

      GROUP BY
        po.id,
        o.service_name,
        o.geo,
        o.carrier,
        po.publisher_cpa,
        po.daily_cap

      ORDER BY
        revenue DESC,
        o.geo,
        o.carrier,
        po.publisher_cpa,
        po.daily_cap
    `;

    const { rows } = await pool.query(query, [publisherId]);

    res.json(rows);
  } catch (err) {
    console.error("PUBLISHER DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

export default router;
