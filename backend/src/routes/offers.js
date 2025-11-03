import express from "express";
import pool from "../db.js";
const router = express.Router();

// ✅ Get all offers
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, advertiser_id, payout, url, status 
       FROM offers ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create
router.post("/", async (req, res) => {
  const { name, advertiser_id, payout, url, status } = req.body;
  
  const result = await pool.query(
    `INSERT INTO offers (name, advertiser_id, payout, url, status)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [name, advertiser_id, payout, url, status]
  );

  res.json(result.rows[0]);
});

export default router;
