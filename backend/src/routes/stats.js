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
    
    const result = await pool.query(statsQuery);

    res.json({
      publishers: Number(result.rows[0].publishers),
      advertisers: Number(result.rows[0].advertisers),
      offers: Number(result.rows[0].offers),
      conversions: Number(result.rows[0].conversions),
      refreshedAt: new Date()
    });

  } catch (err) {
    console.error("Stats error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
