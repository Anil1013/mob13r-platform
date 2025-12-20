import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/*
 GET /api/reports/inapp?from=2025-12-01&to=2025-12-19
*/
router.get("/", authJWT, async (req, res) => {
  try {
    const { from, to } = req.query;

    const query = `
      SELECT
        ptl.pub_code                            AS pub_id,
        pub.name                               AS publisher_name,
        o.advertiser_name,
        o.offer_id,
        o.name                                 AS offer_name,
        DATE(ps.created_at)                    AS report_date,

        COUNT(ps.id)                           AS pin_request_count,
        COUNT(DISTINCT ps.msisdn)              AS unique_pin_request_count,

        COUNT(ps.id) FILTER (WHERE ps.status = true)
                                               AS pin_send_count,
        COUNT(DISTINCT ps.msisdn)
          FILTER (WHERE ps.status = true)
                                               AS unique_pin_send_count,

        COUNT(pv.id)                           AS pin_validation_request_count,
        COUNT(DISTINCT pv.msisdn)
                                               AS unique_pin_validation_request_count,

        COUNT(pv.id) FILTER (WHERE pv.status = true)
                                               AS pin_validate_count,

        COUNT(c.id)                            AS send_conversion_count,

        /* 💰 AMOUNTS */
        COUNT(c.id) * o.payout                 AS advertiser_amount,
        COUNT(c.id) * ptl.payout               AS publisher_amount,

        MAX(ps.created_at)                     AS last_ping_gen_time,
        MAX(ps.created_at)
          FILTER (WHERE ps.status = true)
                                               AS last_ping_gen_success_time,

        MAX(pv.created_at)                     AS last_pinverification_datetime,
        MAX(pv.created_at)
          FILTER (WHERE pv.status = true)
                                               AS last_success_pinverification_datetime

      FROM pin_send_logs ps
      LEFT JOIN pin_verify_logs pv
        ON pv.session_key = ps.session_key

      LEFT JOIN conversions c
        ON c.session_key = ps.session_key

      JOIN publisher_tracking_links ptl
        ON ptl.pub_code = ps.pub_id

      JOIN publishers pub
        ON pub.id = ptl.publisher_id

      JOIN offers o
        ON o.offer_id = ps.offer_id

      WHERE ps.created_at::date BETWEEN $1 AND $2

      GROUP BY
        ptl.pub_code,
        pub.name,
        o.advertiser_name,
        o.offer_id,
        o.name,
        o.payout,
        ptl.payout,
        DATE(ps.created_at)

      ORDER BY report_date DESC;
    `;

    const { rows } = await pool.query(query, [from, to]);
    res.json(rows);

  } catch (err) {
    console.error("❌ Inapp Report Error:", err);
    res.status(500).json({ error: "Failed to fetch inapp report" });
  }
});

export default router;
