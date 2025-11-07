import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================
   ✅ FETCH FRAUD ALERTS
====================== */
router.get("/fraud-alerts", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT fa.id, fa.ip_address, fa.reason, fa.risk_score, fa.created_at,
             p.name AS publisher_name, a.name AS advertiser_name
      FROM fraud_alerts fa
      LEFT JOIN publishers p ON fa.publisher_id = p.id
      LEFT JOIN advertisers a ON fa.advertiser_id = a.id
      ORDER BY fa.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /fraud-alerts error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ✅ FETCH CONVERSIONS LOG
========================= */
router.get("/conversions", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.click_id, c.payout, c.status, c.conversion_time,
             p.name AS publisher_name, a.name AS advertiser_name
      FROM conversions c
      LEFT JOIN publishers p ON c.publisher_id = p.id
      LEFT JOIN advertisers a ON c.advertiser_id = a.id
      ORDER BY c.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /conversions error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
