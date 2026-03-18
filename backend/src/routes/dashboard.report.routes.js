import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
========================================
GET REPORT
========================================
*/

router.get("/report", async (req, res) => {
  try {
    const {
      from_date,
      to_date,
      advertiser,
      publisher,
      geo,
      carrier,
      offer_id,
    } = req.query;

    const query = `
    SELECT

    DATE(ps.created_at) as date,

    a.name as advertiser_name,
    o.offer_name,
    p.name as publisher_name,

    ps.params->>'geo' as geo,
    ps.params->>'carrier' as carrier,

    MAX(o.cpa) as cpa,
    MAX(o.cap) as cap,

    COUNT(*) FILTER (WHERE ps.status='OTP_SENT') as pin_req,
    COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status='OTP_SENT') as unique_req,

    COUNT(*) FILTER (WHERE ps.status='OTP_SENT') as pin_sent,
    COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status='OTP_SENT') as unique_sent,

    COUNT(*) FILTER (WHERE ps.status IN ('VERIFY_REQUESTED','VERIFIED')) as verify_req,
    COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status IN ('VERIFY_REQUESTED','VERIFIED')) as unique_verify,

    COUNT(*) FILTER (WHERE ps.status='VERIFIED') as verified,

    ROUND(
      CASE 
        WHEN COUNT(*) FILTER (WHERE ps.status='OTP_SENT') > 0 
        THEN (
          COUNT(*) FILTER (WHERE ps.status='VERIFIED') * 100.0 /
          COUNT(*) FILTER (WHERE ps.status='OTP_SENT')
        )
        ELSE 0
      END, 2
    ) as cr_percent,

    ROUND(
      COUNT(*) FILTER (WHERE ps.status='VERIFIED') * MAX(o.cpa),
      2
    ) as revenue,

    MAX(ps.created_at) FILTER (WHERE ps.status='OTP_SENT') as last_pin_gen,
    MAX(ps.created_at) FILTER (WHERE ps.status IN ('VERIFY_REQUESTED','VERIFIED')) as last_verification,
    MAX(ps.created_at) FILTER (WHERE ps.status='VERIFIED') as last_success_verification

    FROM pin_sessions ps

    LEFT JOIN offers o ON o.id = ps.offer_id
    LEFT JOIN advertisers a ON a.id = o.advertiser_id
    LEFT JOIN publishers p ON p.id = ps.publisher_id

    WHERE 1=1
    AND ($1::date IS NULL OR DATE(ps.created_at) >= $1)
    AND ($2::date IS NULL OR DATE(ps.created_at) <= $2)
    AND ($3::int IS NULL OR a.id = $3)
    AND ($4::int IS NULL OR p.id = $4)
    AND ($5::text IS NULL OR ps.params->>'geo' = $5)
    AND ($6::text IS NULL OR ps.params->>'carrier' = $6)
    AND ($7::int IS NULL OR o.id = $7)

    GROUP BY
    DATE(ps.created_at),
    a.name,
    o.offer_name,
    p.name,
    ps.params->>'geo',
    ps.params->>'carrier'

    ORDER BY date DESC
    `;

    const values = [
      from_date || null,
      to_date || null,
      advertiser || null,
      publisher || null,
      geo || null,
      carrier || null,
      offer_id || null,
    ];

    const result = await pool.query(query, values);

    /*
    ============================
    SUMMARY (TOP STATS)
    ============================
    */

    const summaryQuery = `
    SELECT
      COUNT(*) FILTER (WHERE status='OTP_SENT') as requests,
      COUNT(*) FILTER (WHERE status='OTP_SENT') as otp_sent,
      COUNT(*) FILTER (WHERE status='VERIFIED') as verified
    FROM pin_sessions
    WHERE 1=1
    AND ($1::date IS NULL OR DATE(created_at) >= $1)
    AND ($2::date IS NULL OR DATE(created_at) <= $2)
    `;

    const summaryRes = await pool.query(summaryQuery, [
      from_date || null,
      to_date || null,
    ]);

    res.json({
      status: "SUCCESS",
      total: result.rows.length,
      summary: summaryRes.rows[0],
      data: result.rows,
    });
  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      error: err.message,
    });
  }
});

/*
========================================
FILTER DATA
========================================
*/

router.get("/filters", async (req, res) => {
  try {
    const advertisers = await pool.query(
      `SELECT id, name FROM advertisers ORDER BY name`
    );

    const publishers = await pool.query(
      `SELECT id, name FROM publishers ORDER BY name`
    );

    const offers = await pool.query(
      `SELECT id, offer_name FROM offers ORDER BY offer_name`
    );

    const geos = await pool.query(
      `SELECT DISTINCT params->>'geo' as geo FROM pin_sessions WHERE params->>'geo' IS NOT NULL`
    );

    const carriers = await pool.query(
      `SELECT DISTINCT params->>'carrier' as carrier FROM pin_sessions WHERE params->>'carrier' IS NOT NULL`
    );

    res.json({
      advertisers: advertisers.rows,
      publishers: publishers.rows,
      offers: offers.rows,
      geos: geos.rows.map((g) => g.geo),
      carriers: carriers.rows.map((c) => c.carrier),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
========================================
REALTIME STATS
========================================
*/

router.get("/realtime", async (req, res) => {
  try {
    const query = `
    SELECT
      COUNT(*) FILTER (WHERE status='OTP_SENT') as total_requests,
      COUNT(*) FILTER (WHERE status='OTP_SENT') as otp_sent,
      COUNT(*) FILTER (WHERE status='VERIFIED') as conversions,
      COUNT(*) FILTER (
        WHERE status='OTP_SENT'
        AND created_at >= NOW() - INTERVAL '1 hour'
      ) as last_hour_requests
    FROM pin_sessions
    `;

    const result = await pool.query(query);

    res.json({
      status: "SUCCESS",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
