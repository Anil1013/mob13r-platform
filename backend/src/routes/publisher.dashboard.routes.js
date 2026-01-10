import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/**
 * GET /api/publisher/dashboard/offers
 *
 * Default: Today data
 * Optional:
 * ?from=ISO_DATE
 * ?to=ISO_DATE
 */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    let { from, to } = req.query;

    /* ================= DEFAULT DATE (TODAY) ================= */
    if (!from || !to) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      from = start.toISOString();
      to = new Date().toISOString();
    }

    const params = [publisherId, from, to];

    /* ================= QUERY ================= */

    const query = `
      WITH offer_stats AS (
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
         AND ps.created_at BETWEEN $2::timestamptz AND $3::timestamptz

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
      )

      SELECT
        *,
        (SELECT COALESCE(SUM(pin_request_count),0) FROM offer_stats) AS total_pin_requests,
        (SELECT COALESCE(SUM(unique_pin_verified),0) FROM offer_stats) AS total_verified,
        (SELECT COALESCE(SUM(revenue),0) FROM offer_stats) AS total_revenue
      FROM offer_stats
      ORDER BY revenue DESC, geo, carrier
    `;

    const { rows } = await pool.query(query, params);

    /* ================= SUMMARY ================= */

    const summary = {
      total_pin_requests: rows[0]?.total_pin_requests || 0,
      total_verified: rows[0]?.total_verified || 0,
      total_revenue: rows[0]?.total_revenue || 0,
    };

    /* ================= CLEAN ROWS ================= */

    const cleanRows = rows.map(
      ({ total_pin_requests, total_verified, total_revenue, ...rest }) =>
        rest
    );

    /* ================= PUBLISHER INFO ================= */

    const publisher = {
      id: req.publisher.id,
      name: req.publisher.name,
    };

    res.json({
      publisher,
      summary,
      rows: cleanRows,
    });
  } catch (err) {
    console.error("❌ PUBLISHER DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

export default router;
