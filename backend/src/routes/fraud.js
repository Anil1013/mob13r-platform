import express from "express";
import pool from "../db.js";

const router = express.Router();

// Return latest fraud logs
router.get("/alerts", async (req, res) => {
  try {
    const q = `
      SELECT id, pub_id, ip, user_agent, reason, created_at
      FROM fraud_alerts
      ORDER BY created_at DESC
      LIMIT 200
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("FRAUD ALERTS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
