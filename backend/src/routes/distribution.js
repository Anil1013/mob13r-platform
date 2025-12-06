import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* =====================================================
   GET TRACKING LINKS (by pub_code)
===================================================== */
router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_code } = req.query;

    if (!pub_code)
      return res.status(400).json({ error: "pub_code required" });

    const q = `
      SELECT 
        id, pub_code, publisher_name, name, geo, carrier, type,
        tracking_url, landing_page_url, required_params
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
   GET RULES (tracking_link_id)
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
      ORDER BY priority ASC, id ASC
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
    if (!tracking_link_id) return res.status(400).json({ error: "tracking_link_id required" });
    if (!offer_id) return res.status(400).json({ error: "offer_id required" });

    // INSERT
    const insert = `
      INSERT INTO distribution_rules
      (pub_code, tracking_link_id, offer_id, geo, carrier, device,
       priority, weight, is_fallback, is_active, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'active')
      RETURNING *
    `;

    const row = await pool.query(insert, [
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

    res.json(row.rows[0]);
  } catch (err) {
    console.error("create rule error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   UPDATE RULE
===================================================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      priority,
      weight,
      is_fallback,
    } = req.body;

    const update = `
      UPDATE distribution_rules
      SET pub_code=$1, tracking_link_id=$2, offer_id=$3, geo=$4, carrier=$5,
          device=$6, priority=$7, weight=$8, is_fallback=$9, updated_at=NOW()
      WHERE id=$10
      RETURNING *
    `;

    const result = await pool.query(update, [
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      priority,
      weight,
      is_fallback,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("update rule error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   DELETE RULE (soft delete)
===================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(
      "UPDATE distribution_rules SET is_active=false WHERE id=$1",
      [req.params.id]
    );

    res.json({ message: "Rule deleted" });
  } catch (err) {
    console.error("delete rule error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
