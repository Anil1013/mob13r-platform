import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ========================================
   ✅ CLICK ANALYTICS WITH FILTERS + HOURLY
======================================== */
router.get("/clicks", authJWT, async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      publisher_id,
      offer_id,
      geo,
      carrier,
    } = req.query;

    let conditions = [];
    let values = [];
    let i = 1;

    // Date filter
    if (start_date) {
      conditions.push(`created_at >= $${i++}`);
      values.push(start_date);
    }
    if (end_date) {
      conditions.push(`created_at <= $${i++}`);
      values.push(end_date);
    }

    // Publisher filter
    if (publisher_id) {
      conditions.push(`publisher_id = $${i++}`);
      values.push(publisher_id);
    }

    // Offer filter
    if (offer_id) {
      conditions.push(`offer_id = $${i++}`);
      values.push(offer_id);
    }

    // GEO filter
    if (geo) {
      conditions.push(`geo = $${i++}`);
      values.push(geo.toUpperCase());
    }

    // Carrier filter
    if (carrier) {
      conditions.push(`carrier = $${i++}`);
      values.push(carrier.toUpperCase());
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        c.id,
        c.click_id,
        c.geo,
        c.carrier,
        c.ip_address,
        c.created_at,
        p.name AS publisher_name,
        o.name AS offer_name
      FROM click_logs c
      LEFT JOIN publishers p ON c.publisher_id = p.id
      LEFT JOIN offers o ON c.offer_id = o.id
      ${where}
      ORDER BY c.id DESC
      LIMIT 5000
    `;

    const { rows } = await pool.query(sql, values);

    // 📌 HOURLY COUNT
    const hourlySQL = `
      SELECT 
        DATE_TRUNC('hour', created_at) AS hour,
        COUNT(*) as clicks
      FROM click_logs
      ${where}
      GROUP BY hour
      ORDER BY hour ASC
    `;

    const hourly = await pool.query(hourlySQL, values);

    res.json({
      success: true,
      total: rows.length,
      data: rows,
      hourly: hourly.rows,
    });

  } catch (error) {
    console.error("CLICK ANALYTICS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
