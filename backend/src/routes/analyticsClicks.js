import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { limit = 200, offset = 0, group = "none", from, to } = req.query;

    let baseQuery = `
      SELECT 
        ac.id,
        ac.pub_id,
        ac.geo,
        ac.carrier,
        ac.ip,
        ac.ua,
        ac.referer,
        ac.offer_id,
        ac.created_at AS click_time
      FROM analytics_clicks ac
    `;

    let conditions = [];
    let params = [];

    if (from) {
      params.push(from);
      conditions.push(`ac.created_at >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`ac.created_at <= $${params.length}`);
    }

    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    baseQuery += ` ORDER BY ac.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const { rows } = await pool.query(baseQuery, params);

    res.json(rows);
  } catch (error) {
    console.error("GET /analytics/clicks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
