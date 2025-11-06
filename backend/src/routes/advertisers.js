import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * 🧩 GET — All advertisers
 */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, website, status, balance, created_at, updated_at FROM advertisers ORDER BY id DESC"
    );
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ GET /advertisers error:", err);
    res.status(500).json({ error: "Failed to fetch advertisers" });
  }
});

/**
 * 🧩 POST — Create new advertiser
 */
router.post("/", authJWT, async (req, res) => {
  try {
    const { name, email, website } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check duplicate email
    const existing = await pool.query(
      "SELECT id FROM advertisers WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const result = await pool.query(
      `INSERT INTO advertisers (name, email, website, status, balance, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', 0, NOW(), NOW())
       RETURNING id, name, email, website, status, balance, created_at, updated_at`,
      [name, email, website]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ POST /advertisers error:", err);
    res.status(500).json({ error: "Failed to create advertiser" });
  }
});

/**
 * 🧩 PUT — Update advertiser
 */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, website } = req.body;

    // Check advertiser existence
    const check = await pool.query("SELECT id FROM advertisers WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Advertiser not found" });
    }

    // Prevent email conflicts
    const duplicate = await pool.query(
      "SELECT id FROM advertisers WHERE LOWER(email) = LOWER($1) AND id != $2",
      [email, id]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ error: "Email already in use by another advertiser" });
