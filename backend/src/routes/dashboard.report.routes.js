import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
========================================
REPORT API
========================================
*/

router.get("/report", async (req, res) => {
  try {
    const {
      from,
      to,
      advertiser,
      publisher,
      geo,
      carrier,
      offer_id
    } = req.query;

    let conditions = [];
    let values = [];
    let i = 1;

    // ✅ DATE FILTER (FIXED - NO TIMEZONE BUG)
    if (from && to) {
      conditions.push(`
        ps.created_at >= $${i++}::date
        AND ps.created_at < ($${i++}::date + INTERVAL '1 day')
      `);
      values.push(from, to);
    }

    if (advertiser) {
      conditions.push(`o.advertiser_id = $${i++}`);
      values.push(advertiser);
    }

    if (publisher) {
      conditions.push(`p.id = $${i++}`);
      values.push(publisher);
    }

    if (geo) {
      conditions.push(`ps.params->>'geo' = $${i++}`);
      values.push(geo);
    }

    if (carrier) {
      conditions.push(`ps.params->>'carrier' = $${i++}`);
      values.push(carrier);
    }

    if (offer_id) {
      conditions.push(`ps.offer_id = $${i++}`);
      values.push(offer_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        DATE(ps.created_at) AS date,

        o.service_name AS offer_name,
        o.cpa,
        o.capping AS cap,

        adv.name AS advertiser_name,
        p.name AS publisher_name,

        ps.params->>'geo' AS geo,
        ps.params->>'carrier' AS carrier,

        /* PIN REQUEST */
        COUNT(*) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS pin_req,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS unique_req,

        /* PIN SENT */
        COUNT(*) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS pin_sent,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS unique_sent,

        /* VERIFY REQUEST */
        COUNT(*) FILTER (
          WHERE ps.status IN ('VERIFY_SUCCESS','VERIFY_FAILED')
        ) AS verify_req,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('VERIFY_SUCCESS','VERIFY_FAILED')
        ) AS unique_verify,

        /* VERIFIED */
        COUNT(*) FILTER (
          WHERE ps.status = 'VERIFY_SUCCESS'
        ) AS verified,

        /* CR */
        ROUND(
          CASE 
            WHEN COUNT(*) FILTER (
              WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
            ) = 0 THEN 0
            ELSE (
              COUNT(*) FILTER (WHERE ps.status = 'VERIFY_SUCCESS')::decimal
              /
              COUNT(*) FILTER (
                WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
              )
            ) * 100
          END, 2
        ) AS cr_percent,

        /* REVENUE */
        SUM(
          CASE WHEN ps.status = 'VERIFY_SUCCESS' THEN o.cpa ELSE 0 END
        ) AS revenue,

        /* LAST EVENTS */
        MAX(ps.created_at) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED')
        ) AS last_pin_gen,

        MAX(ps.created_at) FILTER (
          WHERE ps.status IN ('VERIFY_SUCCESS','VERIFY_FAILED')
        ) AS last_verification,

        MAX(ps.created_at) FILTER (
          WHERE ps.status = 'VERIFY_SUCCESS'
        ) AS last_success_verification

      FROM pin_sessions ps

      LEFT JOIN offers o ON ps.offer_id = o.id
      LEFT JOIN advertisers adv ON o.advertiser_id = adv.id
      LEFT JOIN publishers p ON ps.publisher_id = p.id

      ${where}

      GROUP BY
        DATE(ps.created_at),
        o.service_name,
        o.cpa,
        o.capping,
        adv.name,
        p.name,
        ps.params->>'geo',
        ps.params->>'carrier'

      ORDER BY date DESC
    `;

    const { rows } = await pool.query(query, values);

    res.json({
      status: "SUCCESS",
      data: rows
    });

  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json({ status: "ERROR" });
  }
});


/*
========================================
FILTERS API
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

    const geos = await pool.query(`
      SELECT DISTINCT ps.params->>'geo' AS geo
      FROM pin_sessions ps
      WHERE ps.params->>'geo' IS NOT NULL
    `);

    const carriers = await pool.query(`
      SELECT DISTINCT ps.params->>'carrier' AS carrier
      FROM pin_sessions ps
      WHERE ps.params->>'carrier' IS NOT NULL
    `);

    const offers = await pool.query(`
      SELECT id, service_name AS offer_name FROM offers
    `);

    res.json({
      advertisers: advertisers.rows,
      publishers: publishers.rows,
      geos: geos.rows.map(g => g.geo),
      carriers: carriers.rows.map(c => c.carrier),
      offers: offers.rows
    });

  } catch (err) {
    console.error("FILTER ERROR:", err);
    res.status(500).json({ status: "ERROR" });
  }
});


/*
========================================
REALTIME API
========================================
*/

router.get("/realtime", async (req, res) => {
  try {

    const stats = await pool.query(`
      SELECT

        COUNT(*) AS total_requests,

        COUNT(*) FILTER (
          WHERE status = 'OTP_SENT'
        ) AS otp_sent,

        COUNT(*) FILTER (
          WHERE status = 'VERIFY_SUCCESS'
        ) AS conversions,

        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        ) AS last_hour_requests

      FROM pin_sessions
    `);

    res.json({
      status: "SUCCESS",
      data: stats.rows[0]
    });

  } catch (err) {
    console.error("REALTIME ERROR:", err);
    res.status(500).json({ status: "ERROR" });
  }
});

export default router;
