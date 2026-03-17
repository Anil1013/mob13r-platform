import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
========================================
REPORT API (FINAL FIXED)
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

    // ✅ DATE FILTER (IST FIX)
    if (from && to) {
      conditions.push(`
        (ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= $${i++}::date
        AND (ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') < ($${i++}::date + INTERVAL '1 day')
      `);
      values.push(from, to);
    }

    if (advertiser) {
      conditions.push(`o.advertiser_id = $${i++}`);
      values.push(advertiser);
    }

    if (publisher) {
      conditions.push(`ps.publisher_id = $${i++}`);
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
        DATE(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS date,

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

        /* PIN SENT */
        COUNT(*) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS pin_sent,

        /* VERIFY REQUEST */
        COUNT(*) FILTER (
          WHERE ps.status IN ('VERIFY_REQUESTED','VERIFIED')
        ) AS verify_req,

        /* VERIFIED */
        COUNT(*) FILTER (
          WHERE ps.status = 'VERIFIED'
        ) AS verified,

        /* CR */
        ROUND(
          CASE 
            WHEN COUNT(*) FILTER (
              WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
            ) = 0 THEN 0
            ELSE (
              COUNT(*) FILTER (WHERE ps.status = 'VERIFIED')::decimal
              /
              COUNT(*) FILTER (
                WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
              )
            ) * 100
          END, 2
        ) AS cr_percent,

        /* REVENUE */
        SUM(
          CASE WHEN ps.status = 'VERIFIED' THEN o.cpa ELSE 0 END
        ) AS revenue

      FROM pin_sessions ps

      LEFT JOIN offers o ON ps.offer_id = o.id
      LEFT JOIN advertisers adv ON o.advertiser_id = adv.id
      LEFT JOIN publishers p ON ps.publisher_id = p.id

      ${where}

      GROUP BY
        DATE(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'),
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
      count: rows.length,
      data: rows
    });

  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json({ status: "ERROR", error: err.message });
  }
});

export default router;
