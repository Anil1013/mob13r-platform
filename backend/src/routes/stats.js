import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const queries = [
      "SELECT COUNT(*) AS total FROM publishers;",
      "SELECT COUNT(*) AS total FROM advertisers;",
      "SELECT COUNT(*) AS total FROM offers;",
      "SELECT COUNT(*) AS total FROM clicks;",
      "SELECT COUNT(*) AS total FROM conversions;"
    ];

    const [
      publishers,
      advertisers,
      offers,
      clicks,
      conversions
    ] = await Promise.all(queries.map(q => pool.query(q)));

    res.json({
      publishers: Number(publishers.rows[0].total),
      advertisers: Number(advertisers.rows[0].total),
      offers: Number(offers.rows[0].total),
      clicks: Number(clicks.rows[0].total),
      conversions: Number(conversions.rows[0].total)
    });

  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
