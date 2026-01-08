import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/**
 * GET /api/publisher/dashboard/offers
 * server-side datatable
 */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;

    const {
      start = 0,
      length = 10,
      search = "",
      from,
      to,
      draw = 1,
    } = req.query;

    const dateFilter =
      from && to
        ? `AND ps.created_at::date BETWEEN $3 AND $4`
        : "";

    const params = from && to
      ? [publisherId, `%${search}%`, from, to, length, start]
      : [publisherId, `%${search}%`, length, start];

    const baseSQL = `
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      LEFT JOIN pin_sessions ps
        ON ps.publisher_offer_id = po.id
        AND ps.publisher_id = po.publisher_id
        ${dateFilter}
      LEFT JOIN publisher_conversions pc
        ON pc.pin_session_uuid = ps.session_id
        AND pc.publisher_id = po.publisher_id
        AND pc.status='SUCCESS'
      WHERE po.publisher_id = $1
        AND po.status='active'
        AND o.service_name ILIKE $2
    `;

    const dataSQL = `
      SELECT
        o.service_name AS offer_name,
        o.geo,
        o.carrier,
        po.publisher_cpa AS cpa,
        po.daily_cap AS cap,

        COUNT(ps.session_id) AS pin_requests,
        COUNT(DISTINCT ps.msisdn) AS unique_pin_requests,

        COUNT(ps.session_id)
          FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED')) AS pin_sent,
        COUNT(DISTINCT ps.msisdn)
          FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED')) AS unique_pin_sent,

        COUNT(ps.session_id)
          FILTER (WHERE ps.otp_attempts > 0 OR ps.status='VERIFIED') AS verify_requests,
        COUNT(DISTINCT ps.msisdn)
          FILTER (WHERE ps.otp_attempts > 0 OR ps.status='VERIFIED') AS unique_verify_requests,

        COUNT(ps.session_id)
          FILTER (WHERE ps.publisher_credited=TRUE) AS verified,

        COALESCE(SUM(pc.publisher_cpa),0) AS revenue
      ${baseSQL}
      GROUP BY o.id, po.publisher_cpa, po.daily_cap
      ORDER BY o.id DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const countSQL = `
      SELECT COUNT(DISTINCT o.id) AS total
      ${baseSQL}
    `;

    const [rows, count] = await Promise.all([
      pool.query(dataSQL, params),
      pool.query(countSQL, params.slice(0, params.length - 2)),
    ]);

    res.json({
      draw: Number(draw),
      recordsTotal: Number(count.rows[0].total),
      recordsFiltered: Number(count.rows[0].total),
      data: rows.rows,
    });
  } catch (err) {
    console.error("PUBLISHER DASHBOARD ERROR", err);
    res.status(500).json({ status: "FAILED" });
  }
});

export default router;
