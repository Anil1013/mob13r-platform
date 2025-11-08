// backend/src/routes/advertisers.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* 🟢 Get all advertisers */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email, status FROM advertisers ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /api/advertisers error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/* 🟡 Create advertiser */
router.post("/", authJWT, async (req, res) => {
  try {
    const { name, email, status } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Advertiser name is required" });
    }

    const result = await pool.query(
      `INSERT INTO advertisers (name, email, status)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, status`,
      [name, email || null, status || "active"]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/advertisers error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

/* 🟣 Update advertiser */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, status } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = await pool.query(
      `UPDATE advertisers
       SET name=$1, email=$2, status=$3
       WHERE id=$4
       RETURNING id, name, email, status`,
      [name, email || null, status || "active", id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Advertiser not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /api/advertisers/:id error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

export default router;
