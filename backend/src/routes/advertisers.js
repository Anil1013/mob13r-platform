import express from "express";
import pool from "../db.js";

const router = express.Router();

// ✅ Get all advertisers
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, website, status 
       FROM advertisers ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET advertisers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Create advertiser
router.post("/", async (req, res) => {
  try {
    const { name, email, website } = req.body;

    const result = await pool.query(
      `INSERT INTO advertisers (name, email, website, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [name, email, website]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("POST advertiser error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update advertiser
router.put("/:id", async (req, res) => {
  try {
    const { name, email, website, status } = req.body;

    const result = await pool.query(
      `UPDATE advertisers 
       SET name=$1, email=$2, website=$3, status=$4
       WHERE id=$5 RETURNING *`,
      [name, email, website, status ?? "active", req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT advertiser error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Delete advertiser
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM advertisers WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE advertiser error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
