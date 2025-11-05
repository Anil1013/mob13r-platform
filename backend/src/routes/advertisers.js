import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js"; 

const router = express.Router();

// ✅ Get all advertisers
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, website, status, created_at FROM advertisers ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create advertiser
router.post("/", authJWT, async (req, res) => {
  try {
    const { name, email, website } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const q = await pool.query(
      `INSERT INTO advertisers (name, email, website)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [name, email, website]
    );

    res.json(q.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update advertiser
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, website, status } = req.body;

    const q = await pool.query(
      `UPDATE advertisers 
       SET name=$1, email=$2, website=$3, status=$4
       WHERE id=$5
       RETURNING *`,
      [name, email, website, status, id]
    );

    res.json(q.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete advertiser
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM advertisers WHERE id=$1", [id]);

    res.json({ message: "Deleted ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
