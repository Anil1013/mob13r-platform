import express from "express";
import pool from "../models/db.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Fraud alerts list (empty for now)
router.get("/fraud-alerts", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM fraud_alerts ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch fraud alerts" });
  }
});

export default router;
