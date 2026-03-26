import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/* ================== HELPERS ================== */

// Today UTC as YYYY-MM-DD
const todayUTC = () => new Date().toISOString().slice(0, 10);

/**
 * =========================================================
 * GET /api/publisher/dashboard/offers
 * UTC DATE-WISE DASHBOARD
 * =========================================================
 */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    let { from, to } = req.query;

    // Default = today UTC
    if (!from || !to) {
      from = todayUTC();
      to = todayUTC();
    }

    const params = [publisherId, from, to];

    const query = `
      WITH offer_stats AS (
        SELECT
          DATE(
            ps.created_at AT TIME ZONE 'UTC'
          ) AS stat_date,

          po.id AS publisher_offer_id,
          o.service_name AS offer,
          o.geo,
          o.carrier,
          po.publisher_cpa AS cpa,
          po.daily_cap AS cap,

          COUNT(*) FILTER (
            WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
          ) AS pin_request_count,

          COUNT(DISTINCT ps.msisdn) FILTER (
            WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
          ) AS unique_pin_request_count,

          COUNT(*) FILTER (
            WHERE ps.status = 'OTP_SENT'
          ) AS pin_send_count,

          COUNT(DISTINCT ps.msisdn) FILTER (
            WHERE ps.status = 'OTP_SENT'
          ) AS unique_pin_sent,

          COUNT(*) FILTER (
            WHERE ps.parent_session_token IS NOT NULL
          ) AS pin_validation_request_count,

          COUNT(DISTINCT ps.msisdn) FILTER (
            WHERE ps.parent_session_token IS NOT NULL
          ) AS unique_pin_validation_request_count,

          COUNT(DISTINCT ps.session_id) FILTER (
            WHERE ps.publisher_credited = TRUE
          ) AS unique_pin_verified,

          ROUND(
            COUNT(DISTINCT ps.session_id) FILTER (
              WHERE ps.publisher_credited = TRUE
            )::numeric /
            NULLIF(
              COUNT(DISTINCT ps.msisdn)
              FILTER (WHERE ps.status = 'OTP_SENT'),
              0
            ) * 100,
            2
          ) AS cr,

          COALESCE(
            SUM(ps.payout) FILTER (WHERE ps.publisher_credited = TRUE),
            0
          ) AS revenue,

          MAX(
            ps.created_at AT TIME ZONE 'UTC'
          ) AS last_pin_gen_date,

          MAX(
            ps.created_at AT TIME ZONE 'UTC'
          ) FILTER (
            WHERE ps.status = 'OTP_SENT'
          ) AS last_pin_gen_success_date,

          MAX(
            ps.created_at AT TIME ZONE 'UTC'
          ) FILTER (
            WHERE ps.parent_session_token IS NOT NULL
          ) AS last_pin_verification_date,

          MAX(
            ps.credited_at AT TIME ZONE 'UTC'
          ) FILTER (
            WHERE ps.publisher_credited = TRUE
          ) AS last_success_pin_verification_date

        FROM publisher_offers po
        JOIN offers o ON o.id = po.offer_id

        LEFT JOIN pin_sessions ps
          ON (
               ps.publisher_offer_id = po.id
               OR (
                    ps.publisher_offer_id IS NULL
                    AND ps.publisher_id = po.publisher_id
                    AND ps.offer_id = po.offer_id
                  )
             )
         AND DATE(
              ps.created_at AT TIME ZONE 'UTC'
            ) BETWEEN $2 AND $3

        WHERE po.publisher_id = $1

        GROUP BY
          stat_date,
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
      WHERE
        pin_request_count > 0
        OR pin_send_count > 0
        OR pin_validation_request_count > 0
      ORDER BY stat_date ASC, offer, geo, carrier;
    `;

    const { rows } = await pool.query(query, params);

    const summary = {
      total_pin_requests: rows[0]?.total_pin_requests || 0,
      total_verified: rows[0]?.total_verified || 0,
      total_revenue: rows[0]?.total_revenue || 0,
    };

    const cleanRows = rows.map(
      ({ total_pin_requests, total_verified, total_revenue, ...rest }) => rest
    );

    res.json({
      publisher: {
        id: publisherId,
        name: req.publisher.name,
      },
      from,
      to,
      summary,
      rows: cleanRows,
    });
  } catch (err) {
    console.error("❌ PUBLISHER DASHBOARD ERROR:", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

/**
 * =========================================================
 * GET /api/publisher/dashboard/offers/:publisherOfferId/hourly
 * UTC HOURLY DASHBOARD
 * =========================================================
 */
router.get(
  "/dashboard/offers/:publisherOfferId/hourly",
  publisherAuth,
  async (req, res) => {
    try {
      const publisherId = req.publisher.id;
      const { publisherOfferId } = req.params;
      let { from, to } = req.query;

      if (!from || !to) {
        from = todayUTC();
        to = todayUTC();
      }

      const params = [publisherId, publisherOfferId, from, to];

      const query = `
        SELECT
          DATE_TRUNC(
            'hour',
            ps.created_at AT TIME ZONE 'UTC'
          ) AS hour,

          COUNT(DISTINCT ps.msisdn) FILTER (
            WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
          ) AS unique_pin_requests,

          COUNT(DISTINCT ps.msisdn) FILTER (
            WHERE ps.status = 'OTP_SENT'
          ) AS unique_pin_sent,

          COUNT(DISTINCT ps.msisdn) FILTER (
            WHERE ps.parent_session_token IS NOT NULL
          ) AS unique_pin_verification_requests,

          COUNT(DISTINCT ps.session_id) FILTER (
            WHERE ps.publisher_credited = TRUE
          ) AS pin_verified,

          COALESCE(
            SUM(ps.payout) FILTER (WHERE ps.publisher_credited = TRUE),
            0
          ) AS revenue

        FROM publisher_offers po
        JOIN pin_sessions ps
          ON (
               ps.publisher_offer_id = po.id
               OR (
                    ps.publisher_offer_id IS NULL
                    AND ps.publisher_id = po.publisher_id
                    AND ps.offer_id = po.offer_id
                  )
             )

        WHERE po.publisher_id = $1
          AND po.id = $2
          AND DATE(
            ps.created_at AT TIME ZONE 'UTC'
          ) BETWEEN $3 AND $4

        GROUP BY hour
        ORDER BY hour ASC;
      `;

      const { rows } = await pool.query(query, params);

      res.json({
        offer_id: publisherOfferId,
        from,
        to,
        rows,
      });
    } catch (err) {
      console.error("❌ HOURLY DASHBOARD ERROR:", err);
      res.status(500).json({ error: "Failed to load hourly data" });
    }
  }
);

export default router;
