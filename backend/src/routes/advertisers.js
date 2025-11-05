import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ✅ Get all advertisers */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, website, status, balance FROM advertisers ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ✅ Create advertiser */
router.post("/", authJWT, async (req, res) => {
  try {
    const { name, email, website } = req.body;

    const q = await pool.query(
      `INSERT INTO advertisers (name, email, website, status, balance)
       VALUES ($1,$2,$3,'active',0)
       RETURNING id, name, email, website, status, balance`,
      [name, email, website]
    );

    res.json(q.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ✅ Update advertiser */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, website } = req.body;

    const q = await pool.query(
      `UPDATE advertisers 
       SET name=$1, email=$2, website=$3
       WHERE id=$4
       RETURNING id, name, email, website, status, balance`,
      [name, email, website, id]
    );

    if (q.rows.length === 0)
      return res.status(404).json({ error: "Advertiser not found" });

    res.json(q.rows[0]);
