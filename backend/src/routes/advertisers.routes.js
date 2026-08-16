import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

router.get("/", orgAuth, async (req, res) => {
  try {
    const { vertical_id } = req.query;
    const params = [req.orgId];
    let query = `SELECT *, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq_id FROM advertisers WHERE org_id = $1`;
    if (vertical_id) {
      params.push(vertical_id);
      query += ` AND EXISTS (SELECT 1 FROM campaigns c WHERE c.advertiser_id = advertisers.id AND c.vertical_id = $${params.length})`;
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("GET ADVERTISERS ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", orgAuth, async (req, res) => {
  const { name, email } = req.body;
  try {
    if (!name || !name.trim()) return res.status(400).json({ message: "Advertiser name required" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    const postbackKey = crypto.randomBytes(20).toString("hex");
    const result = await pool.query(
      `INSERT INTO advertisers (name, email, org_id, postback_key) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), email ? String(email).trim() : null, req.orgId, postbackKey]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("CREATE ADVERTISER ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id/toggle", orgAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE advertisers SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END
       WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Advertiser not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("TOGGLE ADVERTISER ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Regenerate the postback key (e.g. if it leaked) — the old postback URL stops working immediately.
router.patch("/:id/regenerate-postback-key", orgAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const postbackKey = crypto.randomBytes(20).toString("hex");
    const result = await pool.query(
      `UPDATE advertisers SET postback_key = $1 WHERE id = $2 AND org_id = $3 RETURNING *`,
      [postbackKey, id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Advertiser not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("REGENERATE ADVERTISER KEY ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
