import express from "express";
import pool from "../db.js";
import crypto from "crypto";

const router = express.Router();

// Get / Generate API Key
router.get("/apikey", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT api_key FROM admin_keys LIMIT 1");
    if (rows.length) return res.json({ key: rows[0].api_key });
    res.status(404).json({ error: "NO_KEY" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/apikey", async (req, res) => {
  const key = crypto.randomBytes(24).toString("hex");
  await pool.query("DELETE FROM admin_keys");
  await pool.query("INSERT INTO admin_keys(api_key) VALUES ($1)", [key]);
  res.json({ key });
});

// Fraud alerts mock data (later connect real logic)
router.get("/fraud-alerts", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM fraud_alerts ORDER BY created_at DESC LIMIT 50");
  res.json(rows);
});

export default router;
