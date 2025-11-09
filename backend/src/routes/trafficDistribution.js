// backend/src/routes/trafficDistribution.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * GET /api/traffic-distribution/pubs
 * returns distinct PUB_IDs available from publisher_tracking_links with sample publisher_name
 */
router.get("/pubs", authJWT, async (req, res) => {
  try {
    const q = `
      SELECT DISTINCT ptl.publisher_id AS pub_id,
             COALESCE(pub.name, ptl.publisher_name) AS publisher_name
      FROM publisher_tracking_links ptl
      LEFT JOIN publishers pub ON pub.id = ptl.publisher_id
      ORDER BY ptl.publisher_id
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/traffic-distribution/pubs error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/traffic-distribution/tracking/:pub_id
 * return tracking rows for a pub_id (so frontend can pick geo/carrier/type)
 */
router.get("/tracking/:pub_id", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.params;
    const q = `SELECT * FROM publisher_tracking_links WHERE publisher_id = $1 ORDER BY id`;
    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/traffic-distribution/tracking/:pub_id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/traffic-distribution/offers?geo=&carrier=
 * List active offers that target the supplied geo+carrier (offer_targets join)
 */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const { geo, carrier } = req.query;
    if (!geo || !carrier) return res.status(400).json({ error: "geo and carrier required" });

    const q = `
      SELECT o.offer_id, o.name, o.type, o.payout, o.cap_daily, o.cap_total, o.status, o.is_fallback
      FROM offers o
      JOIN offer_targets t ON t.offer_id = o.offer_id
      WHERE t.geo = $1 AND t.carrier = $2 AND o.status = 'active'
      GROUP BY o.offer_id, o.name, o.type, o.payout, o.cap_daily, o.cap_total, o.status, o.is_fallback
      ORDER BY o.id DESC
    `;
    const { rows } = await pool.query(q, [geo, carrier]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/traffic-distribution/offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/traffic-distribution/list?pub_id=&geo=&carrier=
 * admin listing of publisher_distributions rows (wrapper over earlier endpoint)
 */
router.get("/list", authJWT, async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;
    let q = `SELECT d.*, p.name AS publisher_name, o.name as offer_name, o.advertiser_name
             FROM publisher_distributions d
             LEFT JOIN publishers p ON p.id = d.pub_id
             LEFT JOIN offers o ON o.offer_id = d.offer_id
             WHERE 1=1`;
    const params = [];
    if (pub_id) { params.push(pub_id); q += ` AND d.pub_id = $${params.length}`; }
    if (geo) { params.push(geo); q += ` AND d.geo = $${params.length}`; }
    if (carrier) { params.push(carrier); q += ` AND d.carrier = $${params.length}`; }
    q += " ORDER BY d.pub_id, d.geo, d.carrier, d.sequence_order, d.id";
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/traffic-distribution/list error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/traffic-distribution
 * body: { pub_id, geo, carrier, offer_id, percentage, sequence_order }
 * validations: <=5 rows per pub+geo+carrier, total percentage <= 100
 */
router.post("/", authJWT, async (req, res) => {
  try {
    const { pub_id, geo, carrier, offer_id, percentage = 0, sequence_order = 0 } = req.body;
    if (!pub_id || !geo || !carrier || !offer_id || !percentage) {
      return res.status(400).json({ error: "pub_id, geo, carrier, offer_id and percentage required" });
    }

    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*)::int AS c, COALESCE(SUM(percentage),0)::int AS sum_p FROM publisher_distributions WHERE pub_id=$1 AND geo=$2 AND carrier=$3",
      [pub_id, geo, carrier]
    );
    const { c, sum_p } = countRows[0];
    if (c >= 5) return res.status(400).json({ error: "Max 5 distribution rows allowed per pub+geo+carrier" });
    if (sum_p + percentage > 100) return res.status(400).json({ error: "Total percentage exceeds 100" });

    const insert = await pool.query(
      `INSERT INTO publisher_distributions
       (pub_id, geo, carrier, offer_id, percentage, sequence_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`,
      [pub_id, geo, carrier, offer_id, percentage, sequence_order]
    );
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("POST /api/traffic-distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/traffic-distribution/:id
 */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const { offer_id, percentage, sequence_order } = req.body;

    const r = await pool.query("SELECT * FROM publisher_distributions WHERE id=$1", [id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    const row = r.rows[0];

    if (typeof percentage === "number") {
      const s = await pool.query(
        `SELECT COALESCE(SUM(percentage),0)::int - $1 AS remaining
         FROM publisher_distributions
         WHERE pub_id=$2 AND geo=$3 AND carrier=$4 AND id <> $5`,
        [percentage, row.pub_id, row.geo, row.carrier, id]
      );
      const remaining = s.rows[0].remaining;
      if (remaining + percentage > 100) return res.status(400).json({ error: "Total percentage exceeds 100" });
    }

    const upd = await pool.query(
      `UPDATE publisher_distributions
       SET offer_id = COALESCE($1, offer_id),
           percentage = COALESCE($2, percentage),
           sequence_order = COALESCE($3, sequence_order),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [offer_id || null, percentage || null, sequence_order || null, id]
    );
    res.json(upd.rows[0]);
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
    await pool.query("DELETE FROM publisher_distributions WHERE id=$1", [req.params.id]);
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE /api/traffic-distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
