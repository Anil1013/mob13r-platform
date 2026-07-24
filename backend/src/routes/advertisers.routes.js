import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

router.get("/", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS seq_id FROM advertisers WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", orgAuth, async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO advertisers (name, email, org_id) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, req.orgId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id/toggle", orgAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE advertisers SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END
       WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, req.orgId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
