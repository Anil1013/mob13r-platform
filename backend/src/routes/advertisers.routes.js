import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/* ===================== GET ALL ===================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM advertisers ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch advertisers" });
  }
});

/* ===================== CREATE ===================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email)
      return res.status(400).json({ message: "Name & email required" });

    const { rows } = await pool.query(
      "INSERT INTO advertisers (name, email) VALUES ($1,$2) RETURNING *",
      [name, email]
    );

    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "Email already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to create advertiser" });
  }
});

/* ===================== TOGGLE STATUS ===================== */
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE advertisers
       SET status = CASE
         WHEN status = 'Active' THEN 'Inactive'
         ELSE 'Active'
       END
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Advertiser not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update status" });
  }
});

/* ===================== DELETE ===================== */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM advertisers WHERE id = $1", [id]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete advertiser" });
  }
});

export default router;
