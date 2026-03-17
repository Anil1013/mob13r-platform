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
    carrier: query.carrier,
    status: query.status,
    msisdn: query.msisdn
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

  if (query.msisdn) {
    values.push(`%${query.msisdn}%`);
    where.push(`ps.msisdn ILIKE $${values.length}`);
  }

  if (query.status) {
    values.push(query.status);
    where.push(`ps.status = $${values.length}`);
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
REPORT API
===================================================== */

router.get("/dashboard/report", async (req, res) => {
  try {

    const query = normalizeQuery(req.query);

    const values = [];
    let whereClause = buildFilters(query, values);

    if (!whereClause) {
      whereClause = `
        WHERE (ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = CURRENT_DATE
      `;
    }

    const dataQuery = `
      SELECT
        ps.id,
        ps.offer_id,

        -- ✅ FIXED HERE
        COALESCE(o.service_name, '') AS offer_name,

        COALESCE(p.name, '') AS publisher_name,

        COALESCE((
          SELECT name FROM advertisers WHERE id = o.advertiser_id LIMIT 1
        ), '') AS advertiser_name,

        ps.msisdn,

        ps.params->>'geo' AS geo,
        ps.params->>'carrier' AS carrier,

        ps.publisher_request,
        ps.publisher_response,
        ps.advertiser_request,
        ps.advertiser_response,

        ps.status,

        (ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS created_at_ist

      FROM pin_sessions ps
      LEFT JOIN offers o ON ps.offer_id = o.id
      LEFT JOIN publishers p ON ps.publisher_id = p.id

      ${whereClause}

      ORDER BY ps.created_at DESC
      LIMIT 100;
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM pin_sessions ps
      LEFT JOIN offers o ON ps.offer_id = o.id
      ${whereClause};
    `;

    const dataRes = values.length
  ? await pool.query(dataQuery, values)
  : await pool.query(dataQuery);

const countRes = values.length
  ? await pool.query(countQuery, values)
  : await pool.query(countQuery);

    return res.json({
      success: true,
      total: parseInt(countRes.rows[0].count),
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

      // ✅ FIX HERE ALSO
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
