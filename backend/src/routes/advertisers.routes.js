import express from "express";
import pool from "../db.js";

const router = express.Router();

/**
 * GET all advertisers
 */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM advertisers ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST create advertiser
 */
router.post("/", async (req, res) => {
  const { name, email } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO advertisers (name, email)
       VALUES ($1, $2)
       RETURNING *`,
      [name, email]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH toggle advertiser status
 */
router.patch("/:id/toggle", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE advertisers
       SET status = CASE
         WHEN status = 'active' THEN 'inactive'
         ELSE 'active'
       END
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
