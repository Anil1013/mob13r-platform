// backend/src/routes/fraud.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
  Fraud management API
  - GET  /alerts               -> list recent fraud alerts
  - GET  /whitelist            -> list whitelisted PUB_IDs
  - POST /whitelist           -> add/update whitelist (body: { pub_id, reason })
  - DELETE /whitelist/:pub    -> remove whitelist
  - GET  /blocked             -> list blocked IPs
  - POST /blocked            -> add blocked IP (body: { ip, reason })
  - DELETE /blocked/:ip      -> remove blocked IP
*/

router.get("/alerts", async (req, res) => {
  try {
    const q = `SELECT id, pub_id, ip, user_agent, reason, meta, created_at FROM fraud_alerts ORDER BY created_at DESC LIMIT 500`;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("fraud.alerts.error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* WHITELIST */
router.get("/whitelist", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT pub_id, reason, added_at FROM fraud_whitelist ORDER BY pub_id ASC");
    res.json(rows);
  } catch (err) {
    console.error("fraud.whitelist.get", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/whitelist", async (req, res) => {
  try {
    const { pub_id, reason } = req.body;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });
    await pool.query(
      `INSERT INTO fraud_whitelist (pub_id, reason, added_at) VALUES ($1,$2,NOW())
         ON CONFLICT (pub_id) DO UPDATE SET reason = EXCLUDED.reason, added_at = NOW()`,
      [pub_id, reason || "manual whitelist"]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("fraud.whitelist.post", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/whitelist/:pub", async (req, res) => {
  try {
    const pub = req.params.pub;
    await pool.query("DELETE FROM fraud_whitelist WHERE pub_id = $1", [pub]);
    res.json({ success: true });
  } catch (err) {
    console.error("fraud.whitelist.delete", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* BLOCKED IPS */
router.get("/blocked", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT ip, reason, added_at FROM blocked_ips ORDER BY added_at DESC LIMIT 1000");
    res.json(rows);
  } catch (err) {
    console.error("fraud.blocked.get", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/blocked", async (req, res) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ error: "ip_required" });
    await pool.query(
      `INSERT INTO blocked_ips (ip, reason, added_at) VALUES ($1,$2,NOW())
       ON CONFLICT (ip) DO UPDATE SET reason = EXCLUDED.reason, added_at = NOW()`,
      [ip, reason || "manual block"]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("fraud.blocked.post", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.delete("/blocked/:ip", async (req, res) => {
  try {
    const ip = req.params.ip;
    await pool.query("DELETE FROM blocked_ips WHERE ip = $1", [ip]);
    res.json({ success: true });
  } catch (err) {
    console.error("fraud.blocked.delete", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
