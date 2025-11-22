// backend/src/routes/fraud.js
import express from "express";
import pool from "../db.js";
import { Parser } from "json2csv"; // optional: if installed; otherwise fallback to manual CSV

const router = express.Router();

/**
 * GET /api/fraud/alerts
 * Query: ?pub_id=PUB03&limit=100
 */
router.get("/alerts", async (req, res) => {
  try {
    const { pub_id, limit = 200 } = req.query;
    const params = [];
    let q = `SELECT id, pub_id, ip, ua, geo, carrier, reason, severity, meta, resolved, resolved_by, created_at FROM fraud_alerts`;
    if (pub_id) {
      q += ` WHERE pub_id = $1`;
      params.push(pub_id);
    }
    q += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit));
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("FRAUD ALERTS FETCH ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/fraud/alerts/resolve
 * body: { id: 123, resolved_by: "admin" }
 */
router.post("/alerts/resolve", async (req, res) => {
  try {
    const { id, resolved_by } = req.body;
    if (!id) return res.status(400).json({ error: "id_required" });
    await pool.query("UPDATE fraud_alerts SET resolved = true, resolved_by = $1, resolved_at = NOW() WHERE id = $2", [resolved_by || null, id]);
    res.json({ success: true });
  } catch (err) {
    console.error("FRAUD RESOLVE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/fraud/blacklist
 * body: { ip: "1.2.3.4", note: "reason", created_by: 1 }
 */
router.post("/blacklist", async (req, res) => {
  try {
    const { ip, note, created_by } = req.body;
    if (!ip) return res.status(400).json({ error: "ip_required" });
    await pool.query("INSERT INTO fraud_blacklist (ip, note, created_by, created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING", [ip, note || null, created_by || null]);
    res.json({ success: true });
  } catch (err) {
    console.error("BLACKLIST ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/fraud/whitelist
 * body: { pub_id: "PUB03", note: "testing", created_by: 1 }
 */
router.post("/whitelist", async (req, res) => {
  try {
    const { pub_id, note, created_by } = req.body;
    if (!pub_id) return res.status(400).json({ error: "pub_required" });
    await pool.query("INSERT INTO fraud_whitelist (pub_id, note, created_by, created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT DO NOTHING", [pub_id, note || null, created_by || null]);
    res.json({ success: true });
  } catch (err) {
    console.error("WHITELIST ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/fraud/export?pub_id=PUB03&format=csv
 * Exports alerts for pub (CSV)
 */
router.get("/export", async (req, res) => {
  try {
    const { pub_id, format = "csv" } = req.query;
    const params = [];
    let q = `SELECT id, pub_id, ip, ua, geo, carrier, reason, severity, meta, resolved, resolved_by, created_at FROM fraud_alerts`;
    if (pub_id) {
      q += ` WHERE pub_id = $1`;
      params.push(pub_id);
    }
    q += ` ORDER BY created_at DESC LIMIT 5000`;
    const { rows } = await pool.query(q, params);

    if (format === "csv") {
      const fields = ["id","pub_id","ip","ua","geo","carrier","reason","severity","meta","resolved","resolved_by","created_at"];
      const parser = new Parser({ fields });
      const csv = parser.parse(rows);
      res.header("Content-Type", "text/csv");
      res.header("Content-Disposition", `attachment; filename="fraud_alerts_${pub_id||'all'}.csv"`);
      return res.send(csv);
    } else {
      // JSON
      res.header("Content-Type", "application/json");
      return res.send(JSON.stringify(rows));
    }
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
