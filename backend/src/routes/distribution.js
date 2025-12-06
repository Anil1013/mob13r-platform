// File: backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* =====================================================
   GET TRACKING LINKS FOR A PUBLISHER (by pub_code)
   Example:
   /api/distribution/tracking-links?pub_code=PUB03
===================================================== */
router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_code } = req.query;
    if (!pub_code) return res.status(400).json({ error: "pub_code required" });

    const q = `
      SELECT 
        id, pub_code, publisher_name, name, geo, carrier, type,
        tracking_url, landing_page_url
      FROM publisher_tracking_links
      WHERE pub_code = $1 AND status='active'
      ORDER BY id ASC
    `;

    const result = await pool.query(q, [pub_code]);

    res.json(result.rows);
  } catch (err) {
    console.error("tracking-links error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   GET DISTRIBUTION RULES FOR A TRACKING LINK
===================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { tracking_link_id } = req.query;
    if (!tracking_link_id)
      return res.status(400).json({ error: "tracking_link_id required" });

    const q = `
      SELECT *
      FROM distribution_rules
      WHERE tracking_link_id = $1 AND is_active = true
      ORDER BY priority ASC
    `;

    const result = await pool.query(q, [tracking_link_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("rules error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   CREATE NEW RULE
===================================================== */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const {
      pub_code,
      tracking_link_id,
      offer_id,
      geo = "ALL",
      carrier = "ALL",
      device = "ALL",
      priority = 1,
      weight = 100,
      is_fallback = false,
    } = req.body;

    if (!pub_code) return res.status(400).json({ error: "pub_code required" });
    if (!tracking_link_id)
      return res.status(400).json({ error: "tracking_link_id required" });
    if (!offer_id) return res.status(400).json({ error: "offer_id required" });

    const insert = `
      INSERT INTO distribution_rules
      (pub_id, tracking_link_id, offer_id, geo, carrier, device, priority, weight, is_fallback, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
      RETURNING *
    `;

    const result = await pool.query(insert, [
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      priority,
      weight,
      is_fallback,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("create rule error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   DELETE RULE
===================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "UPDATE distribution_rules SET is_active=false WHERE id=$1",
      [id]
    );

    res.json({ message: "Rule deleted" });
  } catch (err) {
    console.error("delete rule error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
