import express from "express";
import pool from "../db.js";

const router = express.Router();

/**
 *  CLICK ANALYTICS ROUTE
 *  /api/analytics/clicks
 */
router.get("/", async (req, res) => {
  try {
    const {
      limit = 200,
      offset = 0,
      group = "none",
      from,
      to,
      pub_id,
      geo,
      carrier,
      offer_id
    } = req.query;

    let sql = `
      SELECT 
        ac.id,
        ac.pub_id,
        ac.geo,
        ac.carrier,
        ac.ip,
        ac.ua,
        ac.referer,
        ac.offer_id,
        ac.params,
        ac.created_at
      FROM analytics_clicks ac
    `;

    let where = [];
    let params = [];

    // DATE FILTERS
    if (from) {
      params.push(from);
      where.push(`ac.created_at >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      where.push(`ac.created_at <= $${params.length}`);
    }

    // PUB FILTER
    if (pub_id) {
      params.push(pub_id.toString().toUpperCase());
      where.push(`ac.pub_id = $${params.length}`);
    }

    // GEO FILTER
    if (geo) {
      params.push(geo.toUpperCase());
      where.push(`ac.geo = $${params.length}`);
    }

    // CARRIER FILTER
    if (carrier) {
      params.push(`%${carrier}%`);
      where.push(`ac.carrier ILIKE $${params.length}`);
    }

    // OFFER FILTER
    if (offer_id) {
      params.push(offer_id);
      where.push(`ac.offer_id = $${params.length}`);
    }

    if (where.length > 0) {
      sql += " WHERE " + where.join(" AND ");
    }

    sql += ` ORDER BY ac.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    params.push(Number(limit));
    params.push(Number(offset));

    const result = await pool.query(sql, params);

    res.json({
      success: true,
      count: result.rows.length,
      rows: result.rows,
    });
  } catch (error) {
    console.error("GET /analytics/clicks error →", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
