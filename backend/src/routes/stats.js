import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM publishers) AS publishers,
        (SELECT COUNT(*) FROM advertisers) AS advertisers,
        (SELECT COUNT(*) FROM offers) AS offers,
        (SELECT COUNT(*) FROM conversions) AS conversions
    `;
    
    const response = await pool.query(statsQuery);
    res.json(response.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
