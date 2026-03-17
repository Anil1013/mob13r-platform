import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =====================================================
HELPERS
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
    where.push(`ps.created_at >= $${values.length}`);
  }

  if (query.to_date) {
    values.push(query.to_date + " 23:59:59");
    where.push(`ps.created_at <= $${values.length}`);
  }

  return where.length ? `WHERE ${where.join(" AND ")}` : "";
}

/* =====================================================
MAIN REPORT API
===================================================== */

router.get("/dashboard/report", async (req, res) => {
  try {

    const values = [];
    const whereClause = buildFilters(req.query, values);

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    values.push(limit);
    values.push(offset);

    const dataQuery = `
      SELECT
        ps.id,
        ps.offer_id,
        o.name AS offer_name,
        p.name AS publisher_name,
        adv.name AS advertiser_name,

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
      LEFT JOIN advertisers adv ON o.advertiser_id = adv.id

      ${whereClause}

      ORDER BY ps.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length};
    `;

    const countQuery = `
      SELECT COUNT(*) FROM pin_sessions ps
      LEFT JOIN offers o ON ps.offer_id = o.id
      ${whereClause};
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, values),
      pool.query(countQuery, values.slice(0, values.length - 2))
    ]);

    return res.json({
      success: true,
      total: parseInt(countRes.rows[0].count),
      data: dataRes.rows
    });

  } catch (err) {
    console.error("REPORT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* =====================================================
DROPDOWN FILTER DATA
===================================================== */

router.get("/dashboard/filters", async (req, res) => {
  try {

    const [offers, publishers, advertisers, geos, carriers] = await Promise.all([

      pool.query(`SELECT id, name FROM offers ORDER BY name`),

      pool.query(`SELECT id, name FROM publishers ORDER BY name`),

      pool.query(`
        SELECT DISTINCT a.id, a.name
        FROM advertisers a
        JOIN offers o ON o.advertiser_id = a.id
        ORDER BY a.name
      `),

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
    res.status(500).json({ success: false });
  }
});

export default router;
