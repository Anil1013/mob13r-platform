import express from "express";
import pool from "../db.js";
import crypto from "crypto";

const router = express.Router();

// ✅ Get all publishers
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, website, api_key, hold_percent, status 
       FROM publishers ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET publishers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Create publisher
router.post("/", async (req, res) => {
  try {
    const { name, email, website, hold_percent } = req.body;
    const apiKey = crypto.randomBytes(16).toString("hex");

    const result = await pool.query(
      `INSERT INTO publishers (name, email, website, api_key, hold_percent)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [name, email, website, apiKey, hold_percent ?? 20]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST publisher error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update publisher
router.put("/:id", async (req, res) => {
  try {
    const { name, email, website, hold_percent, status } = req.body;

    const result = await pool.query(
      `UPDATE publishers 
       SET name=$1, email=$2, website=$3, hold_percent=$4, status=$5
       WHERE id=$6 RETURNING *`,
      [name, email, website, hold_percent, status ?? "active", req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT publisher error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Regenerate API key
router.post("/:id/regenerate-key", async (req, res) => {
  try {
    const newKey = crypto.randomBytes(16).toString("hex");

    const result = await pool.query(
      `UPDATE publishers SET api_key=$1 WHERE id=$2 RETURNING api_key`,
      [newKey, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("API KEY regenerate error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Delete publisher
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM publishers WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE publisher error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
