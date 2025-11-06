import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";
import crypto from "crypto";

const router = express.Router();

// ✅ List all publishers
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, website, api_key, hold_percent, status FROM publishers ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /publishers error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// ✅ Get single publisher by ID
router.get("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const q = await pool.query("SELECT * FROM publishers WHERE id=$1", [id]);
    if (q.rows.length === 0)
      return res.status(404).json({ error: "Publisher not found" });
    res.json(q.rows[0]);
  } catch (err) {
    console.error("GET /publishers/:id error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// ✅ Create new publisher
router.post("/", authJWT, async (req, res) => {
  try {
    const { name, email, website, hold_percent = 20, status = "active" } = req.body;
    const api_key = crypto.randomBytes(16).toString("hex");

    const q = await pool.query(
      `INSERT INTO publishers (name, email, website, api_key, hold_percent, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`,
      [name, email, website, api_key, hold_percent, status]
    );

    res.json(q.rows[0]);
  } catch (err) {
    console.error("POST /publishers error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// ✅ Update publisher
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, website, hold_percent, status } = req.body;

    const q = await pool.query(
      `UPDATE publishers
       SET name=$1, email=$2, website=$3, hold_percent=$4, status=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, email, website, hold_percent, status || "active", id]
    );

    if (q.rows.length === 0)
      return res.status(404).json({ error: "Publisher not found" });

    res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /publishers/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete publisher
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM publishers WHERE id=$1", [id]);
    res.json({ message: "Publisher deleted" });
  } catch (err) {
    console.error("DELETE /publishers/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Regenerate API key
router.post("/:id/regenerate-key", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const newKey = crypto.randomBytes(16).toString("hex");

    const q = await pool.query(
      "UPDATE publishers SET api_key=$1, updated_at=NOW() WHERE id=$2 RETURNING api_key",
      [newKey, id]
    );

    if (q.rows.length === 0)
      return res.status(404).json({ error: "Publisher not found" });

    res.json({ api_key: q.rows[0].api_key });
  } catch (err) {
    console.error("POST /publishers/:id/regenerate-key error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
