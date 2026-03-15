import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
  Dashboard Report
  /api/dashboard/report
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

    if(from){
      filters.push(`ps.created_at >= $${i++}`);
      values.push(from + " 00:00:00");
    }

    if(to){
      filters.push(`ps.created_at <= $${i++}`);
      values.push(to + " 23:59:59");
    }

    if(advertiser){
      filters.push(`o.advertiser_id = $${i++}`);
      values.push(advertiser);
    }

    if(publisher){
      filters.push(`ps.publisher_id = $${i++}`);
      values.push(publisher);
    }

    if(offer){
      filters.push(`ps.offer_id = $${i++}`);
      values.push(offer);
    }

    if(geo){
      filters.push(`ps.geo = $${i++}`);
      values.push(geo);
    }

    if(carrier){
      filters.push(`ps.carrier = $${i++}`);
      values.push(carrier);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const query = `
      SELECT
        DATE(ps.created_at) as date,

        a.name as advertiser_name,
        o.name as offer_name,
        p.name as publisher_name,

        ps.geo,
        ps.carrier,

        o.cpa,
        o.cap,

        COUNT(*) FILTER (WHERE ps.event='pin_request') as pin_req,
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.event='pin_request') as unique_req,

        COUNT(*) FILTER (WHERE ps.event='pin_sent') as pin_sent,
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.event='pin_sent') as unique_sent,

        COUNT(*) FILTER (WHERE ps.event='verify_request') as verify_req,
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.event='verify_request') as unique_verify,

        COUNT(*) FILTER (WHERE ps.event='verified') as verified,

        ROUND(
          COUNT(*) FILTER (WHERE ps.event='verified')::numeric /
          NULLIF(COUNT(*) FILTER (WHERE ps.event='pin_request'),0) * 100
        ,2) as cr_percent,

        COUNT(*) FILTER (WHERE ps.event='verified') * o.cpa as revenue,

        MAX(ps.created_at) FILTER (WHERE ps.event='pin_request') as last_pin_gen,
        MAX(ps.created_at) FILTER (WHERE ps.event='pin_sent') as last_pin_gen_success,
        MAX(ps.created_at) FILTER (WHERE ps.event='verify_request') as last_verification,
        MAX(ps.created_at) FILTER (WHERE ps.event='verified') as last_success_verification

      FROM pin_sessions ps

      LEFT JOIN offers o
      ON ps.offer_id = o.id

      LEFT JOIN advertisers a
      ON o.advertiser_id = a.id

      LEFT JOIN publishers p
      ON ps.publisher_id = p.id

      ${where}

      GROUP BY
        DATE(ps.created_at),
        a.name,
        o.name,
        p.name,
        ps.geo,
        ps.carrier,
        o.cpa,
        o.cap

      ORDER BY date DESC
    `;

    const result = await pool.query(query, values);

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
