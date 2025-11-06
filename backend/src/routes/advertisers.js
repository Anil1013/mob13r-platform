// backend/src/routes/advertisers.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* Get all advertisers */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email, website, status, balance, created_at, updated_at FROM advertisers ORDER BY id DESC");
    return res.json(rows);
  } catch (err) {
    console.error("GET /api/advertisers error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/* Create advertiser */
router.post("/", authJWT, async (req, res) => {
  try {
    const { name, email, website } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    // Check duplicate email before insert
    const existing = await pool.query("SELECT id FROM advertisers WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const result = await pool.query(
      `INSERT INTO advertisers (name, email, website, status, balance, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', 0, NOW(), NOW())
       RETURNING id, name, email, website, status, balance, created_at, updated_at`,
      [name, email, website || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/advertisers error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/* Update advertiser */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, website } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    // Ensure advertiser exists
    const check = await pool.query("SELECT id FROM advertisers WHERE id=$1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Advertiser not found" });
    }

    // If email is being changed, ensure uniqueness
    const sameEmail = await pool.query("SELECT id FROM advertisers WHERE email=$1 AND id<>$2", [email, id]);
    if (sameEmail.rows.length > 0) {
      return res.status(400).json({ error: "Email already in use by another advertiser" });
    }

    const q = await pool.query(
      `UPDATE advertisers
       SET name=$1, email=$2, website=$3, updated_at=NOW()
       WHERE id=$4
       RETURNING id, name, email, website, status, balance, created_at, updated_at`,
      [name, email, website || null, id]
    );

    return res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /api/advertisers/:id error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/* Delete advertiser */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    // Optionally check if exists
    const check = await pool.query("SELECT id FROM advertisers WHERE id=$1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Advertiser not found" });
    }

    await pool.query("DELETE FROM advertisers WHERE id=$1", [id]);
    return res.json({ message: "Advertiser deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/advertisers/:id error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

export default router;
