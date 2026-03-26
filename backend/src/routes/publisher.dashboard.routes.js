import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateInput(value) {
  if (!value) return true;
  return DATE_REGEX.test(value);
}

/*
=====================================================
DASHBOARD REPORT (FINAL FIXED)
=====================================================
*/
router.get("/dashboard/report", authMiddleware, async (req, res) => {
  try {
    const {
      from,
      to,
      geo,
      carrier,
      publisher,
      offer_id: offerId,
      advertiser,
    } = req.query;

    if (!isValidDateInput(from) || !isValidDateInput(to)) {
      return res.status(400).json({
        status: "FAILED",
        message: "from/to must be YYYY-MM-DD",
      });
    }

    const conditions = [];
    const values = [];

    // ✅ DATE RANGE FIX (IMPORTANT)
    if (from && to) {
      values.push(from);
      values.push(to);
      conditions.push(`
        ps.created_at >= $${values.length - 1}::date
        AND ps.created_at < ($${values.length}::date + INTERVAL '1 day')
      `);
    }

    // ✅ GEO NORMALIZED
    if (geo) {
      values.push(String(geo).trim().toUpperCase());
      conditions.push(`
        TRIM(UPPER(ps.params->>'geo')) = $${values.length}
      `);
    }

    // ✅ CARRIER NORMALIZED
    if (carrier) {
      values.push(String(carrier).trim().toUpperCase());
      conditions.push(`
        TRIM(UPPER(ps.params->>'carrier')) = $${values.length}
      `);
    }

    if (publisher) {
      values.push(publisher);
      conditions.push(`ps.publisher_id = $${values.length}`);
    }

    if (offerId) {
      values.push(offerId);
      conditions.push(`ps.offer_id = $${values.length}`);
    }

    if (advertiser) {
      values.push(advertiser);
      conditions.push(`o.advertiser_id = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const query = `
      SELECT
        DATE(ps.created_at) AS date,

        COALESCE(a.name,'Unknown Advertiser') AS advertiser_name,
        COALESCE(o.service_name,'Unknown Offer') AS offer_name,
        COALESCE(p.name,'Unknown Publisher') AS publisher_name,

        COALESCE(TRIM(UPPER(ps.params->>'geo')),'UNKNOWN') AS geo,
        COALESCE(TRIM(UPPER(ps.params->>'carrier')),'UNKNOWN') AS carrier,

        o.cpa,
        o.daily_cap AS cap,

        /* ================= PIN REQUEST ================= */
        COUNT(*) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS pin_req,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS unique_req,

        /* ================= PIN SENT ================= */
        COUNT(*) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS pin_sent,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS unique_sent,

        /* ================= VERIFY REQUEST ================= */
        COUNT(*) FILTER (
          WHERE ps.status = 'VERIFY_REQUESTED'
        ) AS verify_req,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status = 'VERIFY_REQUESTED'
        ) AS unique_verify,

        /* ================= VERIFIED ================= */
        COUNT(*) FILTER (
          WHERE ps.status = 'VERIFIED'
        ) AS verified,

        /* ================= CR FIX (IMPORTANT) ================= */
        ROUND(
          COUNT(*) FILTER (WHERE ps.status = 'VERIFIED')::numeric /
          NULLIF(
            COUNT(DISTINCT ps.msisdn)
            FILTER (WHERE ps.status = 'OTP_SENT'),
            0
          ) * 100,
          2
        ) AS cr_percent,

        /* ================= REVENUE ================= */
        COALESCE(
          SUM(ps.payout) FILTER (WHERE ps.status = 'VERIFIED'),
          0
        ) AS revenue,

        /* ================= TIMESTAMPS ================= */
        MAX(ps.created_at) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS last_pin_gen,

        MAX(ps.created_at) FILTER (
          WHERE ps.status = 'VERIFY_REQUESTED'
        ) AS last_verification,

        MAX(ps.created_at) FILTER (
          WHERE ps.status = 'VERIFIED'
        ) AS last_success_verification

      FROM pin_sessions ps

      LEFT JOIN offers o ON o.id = ps.offer_id
      LEFT JOIN publishers p ON p.id = ps.publisher_id
      LEFT JOIN advertisers a ON a.id = o.advertiser_id

      ${whereClause}

      GROUP BY
        DATE(ps.created_at),
        a.name,
        o.service_name,
        p.name,
        TRIM(UPPER(ps.params->>'geo')),
        TRIM(UPPER(ps.params->>'carrier')),
        o.cpa,
        o.daily_cap

      ORDER BY date DESC;
    `;

    const result = await pool.query(query, values);

    return res.json({
      status: "SUCCESS",
      data: result.rows,
    });

  } catch (err) {
    console.error("DASHBOARD REPORT ERROR:", err);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to fetch dashboard report",
    });
  }
});

/*
=====================================================
REALTIME (UNCHANGED)
=====================================================
*/
router.get("/dashboard/realtime", authMiddleware, async (_req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS total_requests,

        COUNT(*) FILTER (
          WHERE status = 'OTP_SENT'
        ) AS otp_sent,

        COUNT(*) FILTER (
          WHERE status = 'VERIFIED'
        ) AS conversions,

        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        ) AS last_hour_requests
      FROM pin_sessions;
    `);

    return res.json({
      status: "SUCCESS",
      data: stats.rows[0] || {},
    });

  } catch (err) {
    console.error("REALTIME DASHBOARD ERROR:", err);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to fetch realtime stats",
    });
  }
});

export default router;
