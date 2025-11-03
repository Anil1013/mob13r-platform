import express from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, api_key, status, hold_percent FROM publishers ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { name, email, api_key, hold_percent = 20, status = "active" } = req.body;

    const q = await pool.query(
      `INSERT INTO publishers (name, email, api_key, hold_percent, status)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [name, email, api_key, hold_percent, status]
    );

    res.json(q.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
