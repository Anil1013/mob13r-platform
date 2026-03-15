import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
  Dashboard Report
*/

router.get("/dashboard/report", async (req, res) => {

  try {

    const { from, to } = req.query;

    const query = `
      SELECT
        DATE(ps.created_at) as date,

        o.service_name as offer_name,
        pub.name as publisher_name,

        o.geo,
        o.carrier,

        o.cpa as cpa,
        o.daily_cap as cap,

        COUNT(ps.session_id) as pin_req,

        COUNT(DISTINCT ps.msisdn) as unique_req,

        COUNT(ps.session_id) FILTER (WHERE ps.status='OTP_SENT') as pin_sent,

        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status='OTP_SENT') as unique_sent,

        COUNT(ps.session_id) FILTER (WHERE ps.verified_at IS NOT NULL) as verified,

        ROUND(
          COUNT(ps.session_id) FILTER (WHERE ps.verified_at IS NOT NULL)::numeric
          /
          NULLIF(COUNT(ps.session_id),0)
          * 100
        ,2) as cr_percent,

        SUM(ps.publisher_cpa) FILTER (WHERE ps.publisher_credited=true) as revenue,

        MAX(ps.created_at) as last_pin_gen,

        MAX(ps.verified_at) as last_success_verification

      FROM pin_sessions ps

      LEFT JOIN offers o
      ON ps.offer_id = o.id

      LEFT JOIN publishers pub
      ON ps.publisher_id = pub.id

      WHERE ps.created_at BETWEEN $1 AND $2

      GROUP BY
        DATE(ps.created_at),
        o.service_name,
        pub.name,
        o.geo,
        o.carrier,
        o.cpa,
        o.daily_cap

      ORDER BY date DESC
    `;

    const result = await pool.query(query, [
      from + " 00:00:00",
      to + " 23:59:59"
    ]);

    res.json({
      status: "SUCCESS",
      data: result.rows
    });

  } catch (err) {

    console.error("Dashboard Report Error:", err);

    res.json({
      status: "FAILED"
    });

  }

});

export default router;
