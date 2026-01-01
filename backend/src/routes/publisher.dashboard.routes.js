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

    /* ---------------- PIN REQUESTS ---------------- */
    // NOTE: pin_sessions is a proxy for pin requests (improve later with request logs)
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

    /* ---------------- OTP SENT ---------------- */
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

    /* ---------------- VERIFY REQUESTS ---------------- */
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

    /* ---------------- VERIFIED + REVENUE ---------------- */
    const verifiedRes = await pool.query(
      `
      SELECT
        COUNT(DISTINCT pin_session_id) AS pin_verified,
        COALESCE(SUM(publisher_cpa),0) AS revenue
      FROM publisher_conversions
      WHERE publisher_id = $1
        AND status = 'SUCCESS'
      `,
      [publisherId]
    );

    const total_pin_requests = Number(pinReqRes.rows[0].total_pin_requests);
    const unique_pin_requests = Number(pinReqRes.rows[0].unique_pin_requests);

    const total_pin_sent = Number(pinSentRes.rows[0].total_pin_sent);
    const unique_pin_sent = Number(pinSentRes.rows[0].unique_pin_sent);

    const pin_verification_requests =
      Number(verifyReqRes.rows[0].pin_verification_requests);
    const unique_pin_verification_requests =
      Number(verifyReqRes.rows[0].unique_pin_verification_requests);

    const pin_verified = Number(verifiedRes.rows[0].pin_verified);
    const revenue = Number(verifiedRes.rows[0].revenue);

    /* ---------------- CR ---------------- */
    const CR =
      unique_pin_sent > 0
        ? ((pin_verified / unique_pin_sent) * 100).toFixed(2)
        : "0.00";

    return res.json({
      status: "SUCCESS",
      data: {
        total_pin_requests,
        unique_pin_requests,
        total_pin_sent,
        unique_pin_sent,
        pin_verification_requests,
        unique_pin_verification_requests,
        pin_verified,
        CR: `${CR}%`,
        revenue: `$${revenue.toFixed(2)}`
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

export default router;
