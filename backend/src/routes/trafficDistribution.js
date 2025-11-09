// backend/src/routes/trafficDistribution.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * GET /api/traffic-distribution/:tracking_link_id
 * or GET /api/traffic-distribution?pub_id=...&geo=...&carrier=...
 */
router.get("/", authJWT, async (req, res) => {
  try {
    const { tracking_link_id, pub_id, geo, carrier } = req.query;
    const params = [];
    let q = `SELECT * FROM publisher_offer_distribution WHERE 1=1`;

    if (tracking_link_id) {
      params.push(tracking_link_id);
      q += ` AND tracking_link_id = $${params.length}`;
    }
    if (pub_id) {
      params.push(pub_id);
      q += ` AND pub_id = $${params.length}`;
    }
    if (geo) {
      params.push(geo);
      q += ` AND geo = $${params.length}`;
    }
    if (carrier) {
      params.push(carrier);
      q += ` AND carrier = $${params.length}`;
    }

    q += " ORDER BY id ASC";
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/traffic-distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/traffic-distribution
 * body: { tracking_link_id, pub_id, pub_code, offer_id, geo, carrier, percentage, is_fallback }
 *
 * Validations:
 *  - max 5 active rows per tracking_link_id+geo+carrier
 *  - total active percentage <= 100
 */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      tracking_link_id,
      pub_id,
      pub_code,
      offer_id,
      geo,
      carrier,
      percentage = 0,
      is_fallback = false,
      status = "active",
    } = req.body;

    if (!tracking_link_id || !offer_id || !geo || !carrier) {
      return res.status(400).json({ error: "tracking_link_id, offer_id, geo, carrier required" });
    }

    // check current active rows for this tracking link + geo + carrier
    const curQ = await pool.query(
      `SELECT id, percentage, is_fallback, status FROM publisher_offer_distribution
       WHERE tracking_link_id=$1 AND geo=$2 AND carrier=$3 AND status='active'`,
      [tracking_link_id, geo, carrier]
    );

    // limit of 5 active offers
    if (curQ.rows.length >= 5) {
      return res.status(400).json({ error: "Max 5 active offers are allowed per tracking link+geo+carrier" });
    }

    // compute sum of percentages if adding this one (only if status active)
    const sumPercent = curQ.rows.reduce((s, r) => s + (r.percentage || 0), 0);
    if (status === "active" && (sumPercent + (percentage || 0)) > 100) {
      return res.status(400).json({ error: "Total percentage for active offers cannot exceed 100" });
    }

    // insert
    const insertQ = await pool.query(
      `INSERT INTO publisher_offer_distribution
        (tracking_link_id, pub_id, pub_code, offer_id, geo, carrier, percentage, is_fallback, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
       RETURNING *`,
      [tracking_link_id, pub_id || null, pub_code || null, offer_id, geo, carrier, percentage, is_fallback, status || "active"]
    );

    res.status(201).json(insertQ.rows[0]);
  } catch (err) {
    console.error("POST /api/traffic-distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/traffic-distribution/:id
 * update percentage / fallback / status / offer_id
 * re-check total percentage constraint when status active.
 */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage, is_fallback, status, offer_id } = req.body;

    // Fetch the existing row
    const cur = await pool.query("SELECT * FROM publisher_offer_distribution WHERE id=$1", [id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: "Distribution row not found" });
    const row = cur.rows[0];

    // If activating / changing percentage, ensure total <= 100
    // fetch other active rows for same tracking_link + geo + carrier excluding this row
    const others = await pool.query(
      `SELECT percentage FROM publisher_offer_distribution
       WHERE tracking_link_id=$1 AND geo=$2 AND carrier=$3 AND id<>$4 AND status='active'`,
      [row.tracking_link_id, row.geo, row.carrier, id]
    );
    const sumOthers = others.rows.reduce((s, r) => s + (r.percentage || 0), 0);
    const newStatus = status || row.status;
    const newPercent = (typeof percentage === "number" ? percentage : row.percentage) || 0;

    if (newStatus === "active" && (sumOthers + newPercent) > 100) {
      return res.status(400).json({ error: "Total percentage for active offers cannot exceed 100" });
    }

    const q = await pool.query(
      `UPDATE publisher_offer_distribution
       SET percentage=$1, is_fallback=$2, status=$3, offer_id=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [newPercent, !!is_fallback, newStatus, offer_id || row.offer_id, id]
    );

    res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /api/traffic-distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/traffic-distribution/:id
 */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM publisher_offer_distribution WHERE id=$1", [id]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/traffic-distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
