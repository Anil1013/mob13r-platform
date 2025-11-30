import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   GET DISTRIBUTION RULES
   ====================================================== */
router.get("/", authJWT, async (req, res) => {
  try {
    const { tracking_link_id } = req.query;

    if (!tracking_link_id) {
      return res.status(400).json({ error: "tracking_link_id is required" });
    }

    const query = `
      SELECT pod.*, o.name AS offer_name
      FROM publisher_offer_distribution pod
      LEFT JOIN offers o ON o.offer_id = pod.offer_id
      WHERE pod.tracking_link_id = $1
      ORDER BY pod.is_fallback ASC, pod.id ASC
    `;

    const { rows } = await pool.query(query, [tracking_link_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   GET REMAINING PERCENTAGE
   ====================================================== */
router.get("/remaining", authJWT, async (req, res) => {
  try {
    const { tracking_link_id } = req.query;

    const query = `
      SELECT (100 - COALESCE(SUM(percentage), 0)) AS remaining
      FROM publisher_offer_distribution
      WHERE tracking_link_id = $1 AND is_fallback = false AND status='active'
    `;

    const { rows } = await pool.query(query, [tracking_link_id]);

    res.json({ remainingPercentage: rows[0]?.remaining || 100 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
