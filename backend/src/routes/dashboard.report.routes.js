import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
==================================================
DASHBOARD REPORT
==================================================
*/

router.get("/dashboard/report", async (req, res) => {

  try {

    const { from, to, publisher, offer, geo, carrier } = req.query;

    let filters = [];
    let values = [];
    let i = 1;

    if (from) {
      filters.push(`ps.created_at >= $${i++}`);
      values.push(from + " 00:00:00");
    }

    if (to) {
      filters.push(`ps.created_at <= $${i++}`);
      values.push(to + " 23:59:59");
    }

    if (publisher) {
      filters.push(`ps.publisher_id = $${i++}`);
      values.push(publisher);
    }

    if (offer) {
      filters.push(`ps.offer_id = $${i++}`);
      values.push(offer);
    }

    if (geo) {
      filters.push(`o.geo = $${i++}`);
      values.push(geo);
    }

    if (carrier) {
      filters.push(`o.carrier = $${i++}`);
      values.push(carrier);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `

    SELECT

      DATE(ps.created_at) as date,

      CASE
        WHEN o.service_name IS NULL OR o.service_name = ''
        THEN 'Offer #' || ps.offer_id
        ELSE o.service_name
      END as offer_name,

      COALESCE(pub.name,'Unknown Publisher') as publisher_name,

      o.geo,
      o.carrier,

      o.cpa,
      o.daily_cap as cap,

      COUNT(*) as pin_req,

      COUNT(DISTINCT ps.msisdn) as unique_req,

      COUNT(*) FILTER (WHERE ps.status='OTP_SENT') as pin_sent,

      COUNT(DISTINCT ps.msisdn)
      FILTER (WHERE ps.status='OTP_SENT') as unique_sent,

      COUNT(*) FILTER (WHERE ps.status='VERIFY_REQUESTED') as verify_req,

      COUNT(DISTINCT ps.msisdn)
      FILTER (WHERE ps.status='VERIFY_REQUESTED') as unique_verify,

      COUNT(*) FILTER (WHERE ps.verified_at IS NOT NULL) as verified,

      ROUND(
        COUNT(*) FILTER (WHERE ps.verified_at IS NOT NULL)::numeric
        /
        NULLIF(COUNT(*) FILTER (WHERE ps.status='OTP_SENT'),0)
        *100
      ,2) as cr_percent,

      COALESCE(
        SUM(ps.publisher_cpa)
        FILTER (WHERE ps.publisher_credited = true)
      ,0) as revenue,

      MAX(ps.created_at) as last_pin_gen,

      MAX(ps.created_at)
      FILTER (WHERE ps.status='OTP_SENT')
      as last_pin_gen_success,

      MAX(ps.created_at)
      FILTER (WHERE ps.status='VERIFY_REQUESTED')
      as last_verification,

      MAX(ps.verified_at)
      as last_success_verification

    FROM pin_sessions ps

    LEFT JOIN offers o
    ON ps.offer_id = o.id

    LEFT JOIN publishers pub
    ON ps.publisher_id = pub.id

    ${where}

    GROUP BY
      DATE(ps.created_at),
      ps.offer_id,
      o.service_name,
      pub.name,
      o.geo,
      o.carrier,
      o.cpa,
      o.daily_cap

    ORDER BY date DESC

    `;

    const result = await pool.query(query, values);

    res.json({
      status: "SUCCESS",
      data: result.rows
    });

  }

  catch (err) {

    console.error("Dashboard Error:", err);

    res.status(500).json({
      status: "FAILED",
      error: err.message
    });

  }

});

export default router;
