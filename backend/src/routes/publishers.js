import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";
import crypto from "crypto";

const router = express.Router();

/* 🟢 Get all publishers */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, postback_url, api_key, status FROM publishers ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /publishers error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/* 🟡 Create publisher */
router.post("/", authJWT, async (req, res) => {
  try {
    const { name, email, postback_url, status = "active" } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Publisher name is required" });

    const api_key = crypto.randomBytes(16).toString("hex");

    const result = await pool.query(
      `INSERT INTO publishers (name, email, postback_url, api_key, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, postback_url, api_key, status`,
      [name, email || null, postback_url || null, api_key, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /publishers error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/* 🟣 Update publisher */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, postback_url, status } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const result = await pool.query(
      `UPDATE publishers
       SET name=$1, email=$2, postback_url=$3, status=$4, updated_at=NOW()
       WHERE id=$5
       RETURNING id, name, email, postback_url, api_key, status`,
      [name, email || null, postback_url || null, status || "active", id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Publisher not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /publishers/:id error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/* 🔁 Regenerate API Key */
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
