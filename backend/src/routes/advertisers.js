import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ============================================================
   ✅ Get all advertisers
   ============================================================ */
router.get("/", authJWT, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, website, status, balance, created_at, updated_at FROM advertisers ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ GET advertisers error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✅ Create new advertiser
   ============================================================ */
router.post("/", authJWT, async (req, res) => {
  try {
    const { name, email, website } = req.body;

    if (!name || !email)
      return res.status(400).json({ error: "Name and email are required." });

    const exists = await pool.query("SELECT id FROM advertisers WHERE email=$1", [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ error: "Email already exists." });

    const result = await pool.query(
      `INSERT INTO advertisers (name, email, website, status, balance)
       VALUES ($1, $2, $3, 'active', 0)
       RETURNING id, name, email, website, status, balance, created_at, updated_at`,
      [name, email, website]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ POST advertiser error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✅ Update advertiser
   ============================================================ */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, website, status } = req.body;

    const found = await pool.query("SELECT id FROM advertisers WHERE id=$1", [id]);
    if (found.rows.length === 0)
      return res.status(404).json({ error: "Advertiser not found." });

    const result = await pool.query(
      `UPDATE advertisers
       SET name=$1, email=$2, website=$3, status=$4, updated_at=NOW()
       WHERE id=$5
       RETURNING id, name, email, website, status, balance, updated_at`,
      [name, email, website, status || "active", id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ PUT advertiser error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ✅ Delete advertiser
   ============================================================ */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await pool.query("DELETE FROM advertisers WHERE id=$1 RETURNING id", [id]);

    if (deleted.rowCount === 0)
      return res.status(404).json({ error: "Advertiser not found." });

    res.json({ message: "✅ Advertiser deleted successfully." });
  } catch (err) {
    console.error("❌ DELETE advertiser error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
