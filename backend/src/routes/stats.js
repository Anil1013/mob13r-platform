import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * GET /api/stats
 * Returns overall platform counts
 */
router.get("/", authJWT, async (req, res) => {
  try {
    // Check if each table exists before querying
    const checkTables = ["publishers", "advertisers", "offers", "conversions"];

    for (const table of checkTables) {
      const result = await pool.query(
        `SELECT to_regclass($1) AS exists;`,
        [table]
      );
      if (!result.rows[0].exists) {
        console.warn(`⚠️ Table missing: ${table}`);
      }
    }

    const stats = {};

    // ✅ Use COALESCE to avoid null errors
    const pub = await pool.query("SELECT COALESCE(COUNT(*), 0) AS count FROM publishers;");
    const adv = await pool.query("SELECT COALESCE(COUNT(*), 0) AS count FROM advertisers;");
    const offers = await pool.query("SELECT COALESCE(COUNT(*), 0) AS count FROM offers;");
    const conv = await pool.query("SELECT COALESCE(COUNT(*), 0) AS count FROM conversions;");

    stats.publishers = parseInt(pub.rows[0].count);
    stats.advertisers = parseInt(adv.rows[0].count);
    stats.offers = parseInt(offers.rows[0].count);
    stats.conversions = parseInt(conv.rows[0].count);

    res.json(stats);
  } catch (err) {
    console.error("❌ Stats route error:", err.message);
    res.status(500).json({ error: "Stats fetch failed", details: err.message });
  }
});

export default router;
