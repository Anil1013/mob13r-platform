import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/* =====================================================
   📊 PUBLISHER DASHBOARD SUMMARY (TOP CARDS)
   GET /api/publisher/dashboard/summary
===================================================== */
router.get("/dashboard/summary", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;

    const pinReqRes = await pool.query(
      `
      SELECT
        COUNT(*) AS total_pin_requests,
        COUNT(DISTINCT msisdn) AS unique_pin_requests
      FROM pin_sessions
      WHERE publisher_id = $1
      `,
      [publisherId]
    );

    const pinSentRes = await pool.query(
      `
      SELECT
        COUNT(*) AS total_pin_sent,
        COUNT(DISTINCT msisdn) AS unique_pin_sent
      FROM pin_sessions
      WHERE publisher_id = $1
        AND status IN ('OTP_SENT','VERIFIED')
      `,
      [publisherId]
    );

    const verifyReqRes = await pool.query(
      `
      SELECT
        COUNT(*) AS pin_verification_requests,
        COUNT(DISTINCT msisdn) AS unique_pin_verification_requests
      FROM pin_sessions
      WHERE publisher_id = $1
        AND (otp_attempts >= 1 OR status = 'VERIFIED')
      `,
      [publisherId]
    );

    const verifiedRes = await pool.query(
      `
      SELECT
        COUNT(*) AS pin_verified,
        COALESCE(SUM(publisher_cpa),0) AS revenue
      FROM publisher_conversions
      WHERE publisher_id = $1
        AND status = 'SUCCESS'
      `,
      [publisherId]
    );

    const unique_pin_sent = Number(pinSentRes.rows[0].unique_pin_sent);
    const pin_verified = Number(verifiedRes.rows[0].pin_verified);

    const CR =
      unique_pin_sent > 0
        ? ((pin_verified / unique_pin_sent) * 100).toFixed(2)
        : "0.00";

    return res.json({
      status: "SUCCESS",
      data: {
        total_pin_requests: Number(pinReqRes.rows[0].total_pin_requests),
        unique_pin_requests: Number(pinReqRes.rows[0].unique_pin_requests),
        total_pin_sent: Number(pinSentRes.rows[0].total_pin_sent),
        unique_pin_sent,
        pin_verification_requests: Number(
          verifyReqRes.rows[0].pin_verification_requests
        ),
        unique_pin_verification_requests: Number(
          verifyReqRes.rows[0].unique_pin_verification_requests
        ),
        pin_verified,
        CR: `${CR}%`,
        revenue: `$${Number(verifiedRes.rows[0].revenue).toFixed(2)}`,
      },
    });
  } catch (err) {
    console.error("PUBLISHER DASHBOARD SUMMARY ERROR:", err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Dashboard summary failed",
    });
  }
});

/* =====================================================
   📋 PUBLISHER DASHBOARD OFFERS TABLE
   GET /api/publisher/dashboard/offers
===================================================== */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;

    /*
      LOGIC:
      - Ek publisher ke multiple offers ho sakte hain
      - Internally traffic split ho raha hai (weight / pass%)
      - Publisher ko sirf logical offer-wise data dikhega
    */

    const result = await pool.query(
      `
      SELECT
        o.id                AS offer_id,
        o.name              AS offer_name,
        o.geo,
        o.carrier,
        po.publisher_cpa    AS cpa,
        o.daily_cap         AS cap,

        COUNT(ps.id)                                AS pin_request_count,
        COUNT(DISTINCT ps.msisdn)                   AS unique_pin_request_count,

        COUNT(ps.id) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        )                                           AS pin_send_count,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('OTP_SENT','VERIFIED')
        )                                           AS unique_pin_sent,

        COUNT(ps.id) FILTER (
          WHERE ps.otp_attempts >= 1 OR ps.status='VERIFIED'
        )                                           AS pin_validation_request_count,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.otp_attempts >= 1 OR ps.status='VERIFIED'
        )                                           AS unique_pin_validation_request_count,

        COUNT(pc.id) FILTER (
          WHERE pc.status='SUCCESS'
        )                                           AS unique_pin_verified,

        COALESCE(SUM(pc.publisher_cpa) FILTER (
          WHERE pc.status='SUCCESS'
        ),0)                                        AS revenue,

        MAX(ps.created_at)                          AS last_pin_gen_date,
        MAX(ps.otp_sent_at)                         AS last_pin_gen_success_date,
        MAX(ps.verified_at)                         AS last_pin_verification_date,
        MAX(pc.updated_at) FILTER (
          WHERE pc.status='SUCCESS'
        )                                           AS last_success_pin_verification_date

      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      LEFT JOIN pin_sessions ps
        ON ps.publisher_offer_id = po.id
      LEFT JOIN publisher_conversions pc
        ON pc.pin_session_id = ps.id

      WHERE po.publisher_id = $1
        AND po.status = 'active'

      GROUP BY o.id, o.name, o.geo, o.carrier, po.publisher_cpa, o.daily_cap
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
        last_pin_gen_success_date: r.last_pin_gen_success_date,
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
    console.error("PUBLISHER DASHBOARD OFFERS ERROR:", err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Dashboard offers failed",
    });
  }
});

export default router;
