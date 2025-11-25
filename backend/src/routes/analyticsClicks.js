// backend/src/routes/analyticsClicks.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";
import { Parser as Json2csvParser } from "json2csv";
import ExcelJS from "exceljs";

const router = express.Router();

// ==========================
// CLICK ANALYTICS API
// ==========================
router.get("/", authJWT, async (req, res) => {
  try {
    const {
      from,
      to,
      pub_id,
      offer_id,
      geo,
      carrier,
      q,
      group = "none",
      limit = 200,
      offset = 0,
      format
    } = req.query;

    const params = [];
    let where = "WHERE 1=1";

    if (from) {
      params.push(from);
      where += ` AND ac.created_at >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      where += ` AND ac.created_at <= $${params.length}`;
    }

    if (pub_id) {
      params.push(pub_id.toUpperCase());
      where += ` AND ac.pub_id = $${params.length}`;
    }

    if (offer_id) {
      params.push(Number(offer_id));
      where += ` AND ac.offer_id = $${params.length}`;
    }

    if (geo) {
      params.push(geo.toUpperCase());
      where += ` AND ac.geo = $${params.length}`;
    }

    if (carrier) {
      params.push(`%${carrier}%`);
      where += ` AND ac.carrier ILIKE $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      where += ` AND (ac.ip ILIKE $${params.length} OR ac.ua ILIKE $${params.length})`;
    }

    // ---------------------------
    // MAIN QUERY
    // ---------------------------
    const rowsSQL = `
      SELECT ac.*
      FROM analytics_clicks ac
      ${where}
      ORDER BY ac.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const rowsRes = await pool.query(rowsSQL, [...params, limit, offset]);
    const rows = rowsRes.rows;

    // ---------------------------
    // COUNT TOTAL
    // ---------------------------
    const countSQL = `
      SELECT COUNT(*)::int AS total
      FROM analytics_clicks ac
      ${where}
    `;
    const totalRes = await pool.query(countSQL, params);
    const total = totalRes.rows[0].total;

    // ---------------------------
    // SUCCESS RESPONSE
    // ---------------------------
    res.json({
      rows,
      total,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (err) {
    console.error("GET /analytics/clicks ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
