import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/* ================== HELPERS ================== */

// safely parse date (YYYY-MM-DD OR ISO)
const parseISTDate = (value, isEnd = false) => {
  if (!value) return null;

  // if already ISO
  if (value.includes("T")) {
    const d = new Date(value);
    if (isNaN(d)) return null;
    return d;
  }

  // YYYY-MM-DD → IST boundary
  const time = isEnd ? "23:59:59.999" : "00:00:00.000";
  const d = new Date(`${value}T${time}+05:30`);
  if (isNaN(d)) return null;
  return d;
};

// Convert IST date range → UTC ISO
const istDateRangeToUTC = (from, to) => {
  const fromDate = parseISTDate(from, false);
  const toDate = parseISTDate(to, true);

  if (!fromDate || !toDate) {
    throw new Error("Invalid date range");
  }

  return {
    fromUTC: fromDate.toISOString(),
    toUTC: toDate.toISOString(),
  };
};

// Today IST (YYYY-MM-DD)
const todayIST = () => {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return ist.toISOString().slice(0, 10);
};

/**
 * =========================================================
 * GET /api/publisher/dashboard/offers
 * =========================================================
 */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    let { from, to } = req.query;

    // default = today IST
    if (!from || !to) {
      const today = todayIST();
      from = today;
      to = today;
    }

    const { fromUTC, toUTC } = istDateRangeToUTC(from, to);
    const params = [publisherId, fromUTC, toUTC];

    const query = `
      WITH offer_stats AS (
        SELECT
          DATE(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS stat_date,

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

          MAX(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS last_pin_gen_date,

          MAX(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
          FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED'))
          AS last_pin_gen_success_date,

          MAX(ps.verified_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
          AS last_pin_verification_date,

          MAX(ps.credited_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')
          FILTER (WHERE ps.publisher_credited = TRUE)
          AS last_success_pin_verification_date

        FROM publisher_offers po
        JOIN offers o ON o.id = po.offer_id

        LEFT JOIN pin_sessions ps
          ON ps.publisher_offer_id = po.id
         AND ps.created_at BETWEEN $2 AND $3

        LEFT JOIN publisher_conversions pc
          ON pc.pin_session_uuid = ps.session_id
         AND pc.status = 'SUCCESS'

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

      SELECT *,
        (SELECT COALESCE(SUM(pin_request_count),0) FROM offer_stats) AS total_pin_requests,
        (SELECT COALESCE(SUM(unique_pin_verified),0) FROM offer_stats) AS total_verified,
        (SELECT COALESCE(SUM(revenue),0) FROM offer_stats) AS total_revenue
      FROM offer_stats
      ORDER BY stat_date ASC, offer, geo, carrier
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
    console.error("❌ PUBLISHER DASHBOARD ERROR:", err.message);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

/**
 * =========================================================
 * GET /api/publisher/dashboard/offers/:publisherOfferId/hourly
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
        const today = todayIST();
        from = today;
        to = today;
      }

      const { fromUTC, toUTC } = istDateRangeToUTC(from, to);
      const params = [publisherId, publisherOfferId, fromUTC, toUTC];

      const query = `
        SELECT
          DATE_TRUNC(
            'hour',
            ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'
          ) AS hour,

          COUNT(DISTINCT ps.msisdn) AS unique_pin_requests,

          COUNT(DISTINCT ps.msisdn)
          FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED'))
          AS unique_pin_sent,

          COUNT(DISTINCT ps.msisdn)
          FILTER (WHERE ps.otp_attempts > 0)
          AS unique_pin_verification_requests,

          COUNT(DISTINCT pc.pin_session_uuid) AS pin_verified,

          COALESCE(SUM(pc.publisher_cpa), 0) AS revenue

        FROM publisher_offers po
        JOIN pin_sessions ps
          ON ps.publisher_offer_id = po.id
         AND ps.created_at BETWEEN $3 AND $4

        LEFT JOIN publisher_conversions pc
          ON pc.pin_session_uuid = ps.session_id
         AND pc.status = 'SUCCESS'

        WHERE po.publisher_id = $1
          AND po.id = $2

        GROUP BY hour
        ORDER BY hour ASC
      `;

      const { rows } = await pool.query(query, params);

      res.json({
        offer_id: publisherOfferId,
        from,
        to,
        rows,
      });
    } catch (err) {
      console.error("❌ HOURLY DASHBOARD ERROR:", err.message);
      res.status(500).json({ error: "Failed to load hourly data" });
    }
  }
);

export default router;
