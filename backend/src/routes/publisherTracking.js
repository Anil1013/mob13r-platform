import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

// 🟢 Get all tracking URLs (with optional filters)
router.get("/", authJWT, async (req, res) => {
  try {
    const { pub_id, geo, carrier, name, status } = req.query;
    let q = "SELECT * FROM publisher_tracking_links WHERE 1=1";
    const params = [];
    if (pub_id) { params.push(pub_id); q += ` AND pub_id=$${params.length}`; }
    if (geo) { params.push(geo); q += ` AND geo=$${params.length}`; }
    if (carrier) { params.push(carrier); q += ` AND carrier=$${params.length}`; }
    if (name) { params.push(`%${name}%`); q += ` AND LOWER(name) LIKE LOWER($${params.length})`; }
    if (status) { params.push(status); q += ` AND status=$${params.length}`; }
    q += " ORDER BY id DESC";
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (err) {
    console.error("GET /publisher-tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🟡 Create new tracking URL
router.post("/", authJWT, async (req, res) => {
  try {
    const { pub_id, name, geo, carrier, payout, cap_daily, cap_total, conversions_hold } = req.body;
    if (!pub_id || !geo || !carrier) return res.status(400).json({ error: "pub_id, geo, carrier required" });

    const trackingUrl = `${process.env.BASE_TRACKING_URL || "https://yourdomain.com"}/click?pub_id=${pub_id}&geo=${geo}&carrier=${carrier}`;

    const q = await pool.query(
      `INSERT INTO publisher_tracking_links
       (pub_id, name, geo, carrier, payout, cap_daily, cap_total, conversions_hold, tracking_url, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
       RETURNING *`,
      [pub_id, name, geo, carrier, payout || 0, cap_daily || 0, cap_total || 0, conversions_hold || false, trackingUrl]
    );

    res.status(201).json(q.rows[0]);
  } catch (err) {
    console.error("POST /publisher-tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🟠 Update tracking link
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, payout, cap_daily, cap_total, conversions_hold, status } = req.body;
    const q = await pool.query(
      `UPDATE publisher_tracking_links
       SET name=$1, payout=$2, cap_daily=$3, cap_total=$4, conversions_hold=$5, status=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, payout, cap_daily, cap_total, conversions_hold, status, id]
    );
    res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /publisher-tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔴 Delete tracking link
router.delete("/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM publisher_tracking_links WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /publisher-tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
