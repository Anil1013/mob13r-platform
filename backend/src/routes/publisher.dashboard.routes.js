import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/* =====================================================
   🕛 DAILY FILTER
===================================================== */
const TODAY = `CURRENT_DATE`;

/* =====================================================
   📊 DASHBOARD SUMMARY (TOP CARDS)
===================================================== */
router.get("/dashboard/summary", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;

    const result = await pool.query(
      `
      SELECT
        COUNT(*)                                                AS total_pin_requests,
        COUNT(DISTINCT msisdn)                                  AS unique_pin_requests,

        COUNT(*) FILTER (
          WHERE status IN ('OTP_SENT','VERIFIED')
        )                                                       AS total_pin_sent,

        COUNT(DISTINCT msisdn) FILTER (
          WHERE status IN ('OTP_SENT','VERIFIED')
        )                                                       AS unique_pin_sent,

        COUNT(*) FILTER (
          WHERE otp_attempts >= 1 OR status = 'VERIFIED'
        )                                                       AS pin_verification_requests,

        COUNT(DISTINCT msisdn) FILTER (
          WHERE otp_attempts >= 1 OR status = 'VERIFIED'
        )                                                       AS unique_pin_verification_requests,

        COUNT(*) FILTER (
          WHERE publisher_credited = TRUE
        )                                                       AS pin_verified

      FROM pin_sessions
      WHERE publisher_id = $1
        AND created_at::date = ${TODAY}
      `,
      [publisherId]
    );

    const revenueRes = await pool.query(
      `
      SELECT COALESCE(SUM(publisher_cpa),0) AS revenue
      FROM publisher_conversions
      WHERE publisher_id = $1
        AND status = 'SUCCESS'
        AND created_at::date = ${TODAY}
      `,
      [publisherId]
    );

    const r = result.rows[0];

    const CR =
      Number(r.unique_pin_sent) > 0
        ? ((Number(r.pin_verified) / Number(r.unique_pin_sent)) * 100).toFixed(2)
        : "0.00";

    return res.json({
      status: "SUCCESS",
      data: {
        total_pin_requests: Number(r.total_pin_requests),
        unique_pin_requests: Number(r.unique_pin_requests),
        total_pin_sent: Number(r.total_pin_sent),
        unique_pin_sent: Number(r.unique_pin_sent),
        pin_verification_requests: Number(r.pin_verification_requests),
        unique_pin_verification_requests: Number(
          r.unique_pin_verification_requests
        ),
        pin_verified: Number(r.pin_verified),
        CR: `${CR}%`,
        revenue: `$${Number(revenueRes.rows[0].revenue).toFixed(2)}`,
      },
    });
  } catch (err) {
    console.error("DASHBOARD SUMMARY ERROR:", err.message);
    res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   📋 DASHBOARD OFFERS TABLE (DAILY)
===================================================== */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;

    const result = await pool.query(
      `
      SELECT
        o.id                      AS offer_id,
        o.service_name            AS offer_name,
        o.geo,
        o.carrier,
        po.publisher_cpa          AS cpa,
        po.daily_cap              AS cap,

        COUNT(ps.id)              AS pin_request_count,
        COUNT(DISTINCT ps.msisdn) AS unique_pin_request_count,

        COUNT(ps.id) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        )                          AS pin_send_count,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        )                          AS unique_pin_sent,

        COUNT(ps.id) FILTER (
          WHERE ps.otp_attempts >= 1 OR ps.status='VERIFIED'
        )                          AS pin_validation_request_count,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.otp_attempts >= 1 OR ps.status='VERIFIED'
        )                          AS unique_pin_validation_request_count,

        COUNT(ps.id) FILTER (
          WHERE ps.publisher_credited = TRUE
        )                          AS unique_pin_verified,

        COALESCE(SUM(pc.publisher_cpa),0) AS revenue,

        MAX(ps.created_at)         AS last_pin_gen_date,
        MAX(ps.verified_at)        AS last_pin_verification_date

      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id

      LEFT JOIN pin_sessions ps
        ON ps.publisher_offer_id = po.id
       AND ps.created_at::date = ${TODAY}

      LEFT JOIN publisher_conversions pc
        ON pc.pin_session_id = ps.id
       AND pc.status = 'SUCCESS'
       AND pc.created_at::date = ${TODAY}

      WHERE po.publisher_id = $1
        AND po.status = 'active'

      GROUP BY
        o.id, o.service_name, o.geo, o.carrier,
        po.publisher_cpa, po.daily_cap

      ORDER BY o.id
      `,
      [publisherId]
    );

    const data = result.rows.map((r) => {
      const cr =
        Number(r.unique_pin_sent) > 0
          ? (
              (Number(r.unique_pin_verified) /
                Number(r.unique_pin_sent)) *
              100
            ).toFixed(2)
          : "0.00";

      return {
        offer_id: r.offer_id,
        offer: r.offer_name,
        geo: r.geo,
        carrier: r.carrier,
        cpa: `$${Number(r.cpa).toFixed(2)}`,
        cap: r.cap,

        pin_request_count: Number(r.pin_request_count),
        unique_pin_request_count: Number(r.unique_pin_request_count),

        pin_send_count: Number(r.pin_send_count),
        unique_pin_sent: Number(r.unique_pin_sent),

        pin_validation_request_count: Number(
          r.pin_validation_request_count
        ),
        unique_pin_validation_request_count: Number(
          r.unique_pin_validation_request_count
        ),

        unique_pin_verified: Number(r.unique_pin_verified),
        CR: `${cr}%`,
        revenue: `$${Number(r.revenue).toFixed(2)}`,

        last_pin_gen_date: r.last_pin_gen_date,
        last_pin_verification_date: r.last_pin_verification_date,
      };
    });

    return res.json({ status: "SUCCESS", data });
  } catch (err) {
    console.error("DASHBOARD OFFERS ERROR:", err.message);
    res.status(500).json({ status: "FAILED" });
  }
});

export default router;
