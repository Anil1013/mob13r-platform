import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/* =====================================================
   📊 PUBLISHER DASHBOARD SUMMARY
===================================================== */
router.get("/dashboard/summary", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;

    const pinReqRes = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_pin_requests,
        COUNT(DISTINCT msisdn)::int AS unique_pin_requests
      FROM pin_sessions
      WHERE publisher_id = $1
      `,
      [publisherId]
    );

    const pinSentRes = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_pin_sent,
        COUNT(DISTINCT msisdn)::int AS unique_pin_sent
      FROM pin_sessions
      WHERE publisher_id = $1
        AND status IN ('OTP_SENT','VERIFIED')
      `,
      [publisherId]
    );

    const verifyReqRes = await pool.query(
      `
      SELECT
        COUNT(*)::int AS pin_verification_requests,
        COUNT(DISTINCT msisdn)::int AS unique_pin_verification_requests
      FROM pin_sessions
      WHERE publisher_id = $1
        AND (otp_attempts > 0 OR status = 'VERIFIED')
      `,
      [publisherId]
    );

    const verifiedRes = await pool.query(
      `
      SELECT
        COUNT(*)::int AS pin_verified,
        COALESCE(SUM(publisher_cpa),0)::numeric AS revenue
      FROM pin_sessions
      WHERE publisher_id = $1
        AND publisher_credited = TRUE
      `,
      [publisherId]
    );

    const uniquePinSent = pinSentRes.rows[0].unique_pin_sent;
    const pinVerified = verifiedRes.rows[0].pin_verified;

    const CR =
      uniquePinSent > 0
        ? ((pinVerified / uniquePinSent) * 100).toFixed(2)
        : "0.00";

    return res.json({
      status: "SUCCESS",
      data: {
        total_pin_requests: pinReqRes.rows[0].total_pin_requests,
        unique_pin_requests: pinReqRes.rows[0].unique_pin_requests,

        total_pin_sent: pinSentRes.rows[0].total_pin_sent,
        unique_pin_sent: uniquePinSent,

        pin_verification_requests:
          verifyReqRes.rows[0].pin_verification_requests,
        unique_pin_verification_requests:
          verifyReqRes.rows[0].unique_pin_verification_requests,

        pin_verified: pinVerified,
        CR: `${CR}%`,
        revenue: `$${Number(verifiedRes.rows[0].revenue).toFixed(2)}`,
      },
    });
  } catch (err) {
    console.error("PUBLISHER DASHBOARD SUMMARY ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Dashboard summary failed",
    });
  }
});

/* =====================================================
   📋 PUBLISHER DASHBOARD OFFERS TABLE
===================================================== */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;

    const result = await pool.query(
      `
      SELECT
        o.id                         AS offer_id,
        o.service_name               AS offer_name,
        o.geo,
        o.carrier,

        po.publisher_cpa             AS cpa,
        po.daily_cap                 AS cap,

        COUNT(ps.session_id)::int                                        AS pin_request_count,
        COUNT(DISTINCT ps.msisdn)::int                                   AS unique_pin_request_count,

        COUNT(ps.session_id) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        )::int                                                           AS pin_send_count,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        )::int                                                           AS unique_pin_sent,

        COUNT(ps.session_id) FILTER (
          WHERE ps.otp_attempts > 0 OR ps.status='VERIFIED'
        )::int                                                           AS pin_validation_request_count,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.otp_attempts > 0 OR ps.status='VERIFIED'
        )::int                                                           AS unique_pin_validation_request_count,

        COUNT(ps.session_id) FILTER (
          WHERE ps.publisher_credited = TRUE
        )::int                                                           AS unique_pin_verified,

        COALESCE(SUM(ps.publisher_cpa) FILTER (
          WHERE ps.publisher_credited = TRUE
        ),0)::numeric                                                    AS revenue,

        MAX(ps.created_at)                                                AS last_pin_gen_date,
        MAX(ps.verified_at)                                               AS last_pin_verification_date,
        MAX(ps.credited_at) FILTER (
          WHERE ps.publisher_credited = TRUE
        )                                                                 AS last_success_pin_verification_date

      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      LEFT JOIN pin_sessions ps
        ON ps.publisher_offer_id = po.id

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
        r.unique_pin_sent > 0
          ? (
              (r.unique_pin_verified / r.unique_pin_sent) *
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

        pin_request_count: r.pin_request_count,
        unique_pin_request_count: r.unique_pin_request_count,

        pin_send_count: r.pin_send_count,
        unique_pin_sent: r.unique_pin_sent,

        pin_validation_request_count: r.pin_validation_request_count,
        unique_pin_validation_request_count:
          r.unique_pin_validation_request_count,

        unique_pin_verified: r.unique_pin_verified,
        CR: `${cr}%`,
        revenue: `$${Number(r.revenue).toFixed(2)}`,

        last_pin_gen_date: r.last_pin_gen_date,
        last_pin_verification_date: r.last_pin_verification_date,
        last_success_pin_verification_date:
          r.last_success_pin_verification_date,
      };
    });

    return res.json({
      status: "SUCCESS",
      data,
    });
  } catch (err) {
    console.error("PUBLISHER DASHBOARD OFFERS ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Dashboard offers failed",
    });
  }
});

export default router;
