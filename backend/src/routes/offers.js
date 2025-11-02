import express from "express";
import pool from "../db.js";

const router = express.Router();

// ✅ Get all offers
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, payout, url, status 
       FROM offers ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET offers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Create Offer
router.post("/", async (req, res) => {
  try {
    const { name, payout, url } = req.body;

    const result = await pool.query(
      `INSERT INTO offers (name, payout, url, status)
       VALUES ($1,$2,$3,'active')
       RETURNING *`,
      [name, payout, url]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST offer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update Offer
router.put("/:id", async (req, res) => {
  try {
    const { name, payout, url, status } = req.body;

    const result = await pool.query(
      `UPDATE offers 
       SET name=$1, payout=$2, url=$3, status=$4
       WHERE id=$5 RETURNING *`,
      [name, payout, url, status ?? "active", req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT offer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Delete Offer
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM offers WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE offer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
