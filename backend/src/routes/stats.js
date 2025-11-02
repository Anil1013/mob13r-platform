import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [publishers, advertisers, offers, conversions] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM publishers"),
      pool.query("SELECT COUNT(*) FROM advertisers"),
      pool.query("SELECT COUNT(*) FROM offers"),
      pool.query("SELECT COUNT(*) FROM conversions")
    ]);

    res.json({
      publishers: Number(publishers.rows[0].count),
      advertisers: Number(advertisers.rows[0].count),
      offers: Number(offers.rows[0].count),
      conversions: Number(conversions.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stats fetch failed" });
  }
});

export default router;
