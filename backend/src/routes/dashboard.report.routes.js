import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =====================================================
NORMALIZE QUERY
===================================================== */

function normalizeQuery(query) {
  return {
    offer_id: query.offer_id || query.offer,
    publisher_id: query.publisher_id || query.publisher,
    from_date: query.from_date || query.from,
    to_date: query.to_date || query.to,
    geo: query.geo,
    carrier: query.carrier
  };
}

/* =====================================================
BUILD FILTERS
===================================================== */

function buildFilters(query, values) {
  let where = [];

  if (query.offer_id) {
    values.push(query.offer_id);
    where.push(`ps.offer_id = $${values.length}`);
  }

  if (query.publisher_id) {
    values.push(query.publisher_id);
    where.push(`ps.publisher_id = $${values.length}`);
  }

  if (query.geo) {
    values.push(query.geo);
    where.push(`ps.params->>'geo' = $${values.length}`);
  }

  if (query.carrier) {
    values.push(query.carrier);
    where.push(`ps.params->>'carrier' = $${values.length}`);
  }

  if (query.from_date) {
    values.push(query.from_date);
    where.push(`
      (ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $${values.length}
    `);
  }

  if (query.to_date) {
    values.push(query.to_date);
    where.push(`
      (ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $${values.length}
    `);
  }

  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

/* =====================================================
REPORT API (🔥 AGGREGATED)
===================================================== */

router.get("/dashboard/report", async (req, res) => {
  try {

    const query = normalizeQuery(req.query);

    const values = [];
    let whereClause = buildFilters(query, values);

    // 👉 DEFAULT TODAY
    if (!whereClause) {
      whereClause = `
        WHERE (ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = CURRENT_DATE
      `;
    }

    /* =====================================================
    MAIN AGGREGATED QUERY
    ===================================================== */

    const dataQuery = `
      SELECT

      DATE(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as date,

      COALESCE(a.name,'') as advertiser_name,
      COALESCE(o.service_name,'') as offer_name,
      COALESCE(p.name,'') as publisher_name,

      ps.params->>'geo' as geo,
      ps.params->>'carrier' as carrier,

      -- PIN REQUEST
      COUNT(*) FILTER (WHERE ps.status IN ('OTP_REQUESTED','OTP_SENT')) as pin_req,
      COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status IN ('OTP_REQUESTED','OTP_SENT')) as unique_req,

      -- PIN SENT
      COUNT(*) FILTER (WHERE ps.status='OTP_SENT') as pin_sent,
      COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status='OTP_SENT') as unique_sent,

      -- VERIFY
      COUNT(*) FILTER (WHERE ps.status IN ('VERIFY_REQUESTED','VERIFIED')) as verify_req,
      COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status IN ('VERIFY_REQUESTED','VERIFIED')) as unique_verify,

      -- VERIFIED
      COUNT(*) FILTER (WHERE ps.status='VERIFIED') as verified,

      -- CR %
      ROUND(
        CASE 
          WHEN COUNT(*) FILTER (WHERE ps.status='OTP_SENT') = 0 THEN 0
          ELSE 
            (COUNT(*) FILTER (WHERE ps.status='VERIFIED')::decimal /
             COUNT(*) FILTER (WHERE ps.status='OTP_SENT')) * 100
        END
      ,2) as cr_percent,

      -- REVENUE (CPA based)
      ROUND(
        COUNT(*) FILTER (WHERE ps.status='VERIFIED') * COALESCE(o.cpa,0)
      ,2) as revenue,

      -- LAST TIMES
      MAX(ps.created_at) FILTER (WHERE ps.status='OTP_SENT') as last_pin_gen,
      MAX(ps.created_at) FILTER (WHERE ps.status IN ('VERIFY_REQUESTED','VERIFIED')) as last_verification,
      MAX(ps.created_at) FILTER (WHERE ps.status='VERIFIED') as last_success_verification

      FROM pin_sessions ps

      LEFT JOIN offers o ON ps.offer_id = o.id
      LEFT JOIN publishers p ON ps.publisher_id = p.id
      LEFT JOIN advertisers a ON a.id = o.advertiser_id

      ${whereClause}

      GROUP BY
     GROUP BY
DATE(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'),
     a.name,
     o.service_name,
      p.name,
      ps.params->>'geo',
      ps.params->>'carrier',
      o.cpa
        
      ORDER BY date DESC;
    `;

    /* =====================================================
    COUNT QUERY (GROUP COUNT)
    ===================================================== */

    const countQuery = `
      SELECT COUNT(*) FROM (
        SELECT 1
        FROM pin_sessions ps
        LEFT JOIN offers o ON ps.offer_id = o.id
        ${whereClause}
        GROUP BY DATE(ps.created_at)
      ) t;
    `;

    const dataRes = values.length
      ? await pool.query(dataQuery, values)
      : await pool.query(dataQuery);

    const countRes = values.length
      ? await pool.query(countQuery, values)
      : await pool.query(countQuery);

    /* =====================================================
    SUMMARY (TOP CARDS)
    ===================================================== */

    let summary = {
      requests: 0,
      otp_sent: 0,
      verified: 0
    };

    dataRes.rows.forEach(r => {
      summary.requests += Number(r.pin_req || 0);
      summary.otp_sent += Number(r.pin_sent || 0);
      summary.verified += Number(r.verified || 0);
    });

    return res.json({
      success: true,
      total: parseInt(countRes.rows[0].count),
      summary,
      data: dataRes.rows
    });

  } catch (err) {
    console.error("REPORT ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/* =====================================================
FILTERS API
===================================================== */

router.get("/dashboard/filters", async (req, res) => {
  try {

    const [offers, publishers, advertisers, geos, carriers] = await Promise.all([

      pool.query(`SELECT id, service_name AS name FROM offers ORDER BY service_name`),

      pool.query(`SELECT id, name FROM publishers ORDER BY name`),

      pool.query(`SELECT id, name FROM advertisers ORDER BY name`),

      pool.query(`
        SELECT DISTINCT params->>'geo' AS geo
        FROM pin_sessions
        WHERE params->>'geo' IS NOT NULL
      `),

      pool.query(`
        SELECT DISTINCT params->>'carrier' AS carrier
        FROM pin_sessions
        WHERE params->>'carrier' IS NOT NULL
      `)

    ]);

    return res.json({
      success: true,
      filters: {
        offers: offers.rows,
        publishers: publishers.rows,
        advertisers: advertisers.rows,
        geos: geos.rows.map(r => r.geo),
        carriers: carriers.rows.map(r => r.carrier)
      }
    });

  } catch (err) {
    console.error("FILTER ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
