import express from "express";
import pool from "../db.js";
import crypto from "crypto";

const router = express.Router();

// 🟢 List all admin API keys
router.get("/apikey", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM admin_keys ORDER BY id DESC;");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Generate new API key
router.post("/apikey", async (req, res) => {
  try {
    const newKey = crypto.randomBytes(24).toString("hex");
    await pool.query("INSERT INTO admin_keys (api_key) VALUES ($1);", [newKey]);
    res.json({ api_key: newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔴 Delete an API key
router.delete("/apikey/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM admin_keys WHERE id = $1;", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
