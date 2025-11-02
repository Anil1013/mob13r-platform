import express from "express";
import pool from "../db.js";
import crypto from "crypto";

const router = express.Router();

// ✅ Get all publishers
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, website, api_key, status, hold_percent 
       FROM publishers ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ Publishers GET Error:", err);
    res.status(500).json({ error: "Failed to fetch publishers" });
  }
});

// ✅ Create publisher (API key auto generated)
router.post("/", async (req, res) => {
  try {
    const { name, email, website, hold_percent = 20 } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name & Email required" });
    }

    const apiKey = crypto.randomBytes(24).toString("hex");

    const result = await pool.query(
      `INSERT INTO publishers (name, email, website, api_key, hold_percent, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, name, email, website, api_key, status, hold_percent`,
      [name, email, website || null, apiKey, hold_percent]
    );

    res.json({
      message: "Publisher created successfully",
      publisher: result.rows[0]
    });
  } catch (err) {
    console.error("❌ Publishers POST Error:", err);
    res.status(500).json({ error: "Failed to create publisher" });
  }
});

// ✅ Regenerate API Key for Publisher
router.post("/:id/regenerate-key", async (req, res) => {
  try {
    const id = req.params.id;
    const apiKey = crypto.randomBytes(24).toString("hex");

    const result = await pool.query(
      `UPDATE publishers SET api_key=$1 WHERE id=$2 RETURNING api_key`,
      [apiKey, id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Publisher not found" });

    res.json({
      message: "API Key regenerated successfully",
      api_key: result.rows[0].api_key
    });
  } catch (err) {
    console.error("❌ Regenerate Key Error:", err);
    res.status(500).json({ error: "Failed to regenerate key" });
  }
});

export default router;
