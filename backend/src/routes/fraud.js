import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
    Fraud API:
    GET  /api/fraud/alerts    → list all fraud alerts
    POST /api/fraud/report    → add new fraud alert
*/

// ===============================
// GET ALL FRAUD ALERTS
// ===============================
router.get("/alerts", async (req, res) => {
  try {
    const q = `
      SELECT id, pub_id, ip, user_agent, reason, created_at
      FROM fraud_alerts
      ORDER BY id DESC
    `;
    const { rows } = await pool.query(q);

    return res.json(rows);
  } catch (err) {
    console.error("❌ FRAUD ALERTS ERROR:", err);
    return res.status(500).json({ error: "failed_to_load_fraud_alerts" });
  }
});

// ===============================
// INSERT NEW FRAUD ALERT
// ===============================
router.post("/report", async (req, res) => {
  try {
    const { pub_id, ip, user_agent, reason } = req.body;

    const q = `
      INSERT INTO fraud_alerts (pub_id, ip, user_agent, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const params = [pub_id, ip, user_agent, reason];

    const { rows } = await pool.query(q, params);

    return res.json(rows[0]);
  } catch (err) {
    console.error("❌ FRAUD REPORT ERROR:", err);
    return res.status(500).json({ error: "failed_to_add_fraud" });
  }
});

export default router;
