import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
  =========================================================
  Dashboard Report API
  GET /api/dashboard/report
  =========================================================
*/

router.get("/dashboard/report", async (req, res) => {
  try {

    const {
      from,
      to,
      advertiser,
      publisher,
      offer,
      geo,
      carrier
    } = req.query;

    let filters = [];
    let values = [];
    let i = 1;

    /* DATE FILTER */

    if (from) {
      filters.push(`ps.created_at >= $${i++}`);
      values.push(from + " 00:00:00");
    }

    if (to) {
      filters.push(`ps.created_at <= $${i++}`);
      values.push(to + " 23:59:59");
    }

    /* ADVERTISER */

    if (advertiser) {
      filters.push(`ps.advertiser_id = $${i++}`);
      values.push(advertiser);
    }

    /* PUBLISHER */

    if (publisher) {
      filters.push(`ps.publisher_id = $${i++}`);
      values.push(publisher);
    }

    /* OFFER */

    if (offer) {
      filters.push(`ps.offer_id = $${i++}`);
      values.push(offer);
    }

    /* GEO */

    if (geo) {
      filters.push(`o.geo = $${i++}`);
      values.push(geo);
    }

    /* CARRIER */

    if (carrier) {
      filters.push(`o.carrier = $${i++}`);
      values.push(carrier);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    /* MAIN QUERY */

    const query = `
      SELECT

        DATE(ps.created_at) as date,

        o.service_name as offer_name,
        pub.name as publisher_name,

        o.geo,
        o.carrier,

        o.cpa,
        o.daily_cap as cap,

        /* PIN REQUEST */

        COUNT(ps.session_id) as pin_req,

        COUNT(DISTINCT ps.msisdn) as unique_req,

        /* OTP SENT */

        COUNT(ps.session_id)
        FILTER (WHERE ps.status = 'OTP_SENT') as pin_sent,

        COUNT(DISTINCT ps.msisdn)
        FILTER (WHERE ps.status = 'OTP_SENT') as unique_sent,

        /* VERIFY REQUEST */

        COUNT(ps.session_id)
        FILTER (WHERE ps.status = 'OTP_VERIFY') as verify_req,

        COUNT(DISTINCT ps.msisdn)
        FILTER (WHERE ps.status = 'OTP_VERIFY') as unique_verify,

        /* VERIFIED */

        COUNT(ps.session_id)
        FILTER (WHERE ps.verified_at IS NOT NULL) as verified,

        /* CR */

        ROUND(
          COUNT(ps.session_id)
          FILTER (WHERE ps.verified_at IS NOT NULL)::numeric
          /
          NULLIF(COUNT(ps.session_id),0)
          * 100
        ,2) as cr_percent,

        /* REVENUE */

        COALESCE(
          SUM(ps.publisher_cpa)
          FILTER (WHERE ps.publisher_credited = true)
        ,0) as revenue,

        /* LAST EVENTS */

        MAX(ps.created_at) as last_pin_gen,

        MAX(ps.created_at)
        FILTER (WHERE ps.status='OTP_SENT')
        as last_pin_gen_success,

        MAX(ps.created_at)
        FILTER (WHERE ps.status='OTP_VERIFY')
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

  } catch (err) {

    console.error("Dashboard Report Error:", err);

    res.status(500).json({
      status: "FAILED",
      error: err.message
    });

  }
});

export default router;
