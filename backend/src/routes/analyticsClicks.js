// backend/src/routes/analyticsClicks.js
import express from "express";
import pool from "../db.js";
import { Parser as Json2csvParser } from "json2csv";
import ExcelJS from "exceljs";

const router = express.Router();

router.get("/", async (req, res) => {
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

    let where = "WHERE 1=1";
    const params = [];

    if (from) {
      params.push(from);
      where += ` AND cl.created_at >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      where += ` AND cl.created_at <= $${params.length}`;
    }

    if (pub_id) {
      params.push(pub_id.toUpperCase());
      where += ` AND cl.pub_code = $${params.length}`;
    }

    if (offer_id) {
      params.push(offer_id.toUpperCase());
      where += ` AND cl.offer_code = $${params.length}`;
    }

    if (geo) {
      params.push(geo.toUpperCase());
      where += ` AND cl.geo = $${params.length}`;
    }

    if (carrier) {
      params.push(carrier);
      where += ` AND cl.carrier ILIKE $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      where += ` AND (
        cl.click_id ILIKE $${params.length}
        OR cl.ip_address ILIKE $${params.length}
        OR cl.user_agent ILIKE $${params.length}
      )`;
    }

    // Main query
    const rowsSql = `
      SELECT 
        cl.id,
        cl.pub_code,
        p.name AS publisher_name,
        cl.offer_code,
        o.name AS offer_name,
        a.name AS advertiser_name,
        cl.ip_address,
        cl.click_id,
        cl.geo,
        cl.carrier,
        cl.user_agent,
        cl.created_at
      FROM click_logs cl
      LEFT JOIN publishers p ON p.code = cl.pub_code
      LEFT JOIN offers o ON o.code = cl.offer_code
      LEFT JOIN advertisers a ON a.id = o.advertiser_id
      ${where}
      ORDER BY cl.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const rowsRes = await pool.query(rowsSql, [...params, limit, offset]);
    const rows = rowsRes.rows;

    // Aggregates summary
    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM click_logs cl
      ${where}
    `;
    const totalRes = await pool.query(totalSql, params);

    res.json({
      rows,
      total: totalRes.rows[0].total,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (err) {
    console.error("GET /analytics/clicks ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
