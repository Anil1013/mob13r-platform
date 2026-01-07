import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/* ================= CORS (FIXED) ================= */
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-publisher-key"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* ================= DATE FILTER ================= */
function buildDateFilter(query, baseIndex = 2) {
  const { from, to } = query;

  if (from && to) {
    return {
      sql: `ps.created_at::date BETWEEN $${baseIndex} AND $${baseIndex + 1}`,
      params: [from, to],
    };
  }

  return {
    sql: "ps.created_at::date = CURRENT_DATE",
    params: [],
  };
}

/* ================= DASHBOARD OFFERS ================= */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    const dateFilter = buildDateFilter(req.query, 2);

    const result = await pool.query(
      `
      SELECT
        o.id AS offer_id,
        o.service_name AS offer_name,
        o.geo,
        o.carrier,
        po.publisher_cpa AS cpa,
        o.daily_cap AS cap,

        COUNT(ps.id) AS pin_request_count,
        COUNT(DISTINCT ps.msisdn) AS unique_pin_request_count,

        COUNT(ps.id) FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED')) AS pin_send_count,
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED')) AS unique_pin_sent,

        COUNT(ps.id) FILTER (WHERE ps.otp_attempts >= 1 OR ps.status='VERIFIED') AS pin_validation_request_count,
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.otp_attempts >= 1 OR ps.status='VERIFIED') AS unique_pin_validation_request_count,

        COUNT(pc.id) AS unique_pin_verified,
        COALESCE(SUM(pc.publisher_cpa),0) AS revenue

      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      LEFT JOIN pin_sessions ps
        ON ps.publisher_offer_id = po.id
        AND ${dateFilter.sql}
      LEFT JOIN publisher_conversions pc
        ON pc.pin_session_id = ps.id
        AND pc.status = 'SUCCESS'

      WHERE po.publisher_id = $1
        AND po.status = 'active'

      GROUP BY
        o.id, o.service_name, o.geo, o.carrier,
        po.publisher_cpa, o.daily_cap

      ORDER BY o.id
      `,
      [publisherId, ...dateFilter.params]
    );

    res.json({
      status: "SUCCESS",
      data: result.rows,
    });
  } catch (err) {
    console.error("PUBLISHER DASHBOARD OFFERS ERROR", err);
    res.status(500).json({ status: "FAILED" });
  }
});

export default router;
