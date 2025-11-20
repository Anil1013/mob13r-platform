// backend/routes/distribution.js
import express from "express";
import pool from "../db.js"; // your pg pool
const router = express.Router();

/**
 * GET /api/distribution/meta?pub_id=PUB01
 * Returns basic metadata for a pub_id:
 * - pub_id
 * - publisher_name (if available from publisher_tracking_links)
 * - publisher_id (if available)
 * - list of distinct geos/carriers (sample)
 */
router.get("/meta", async (req, res) => {
  const { pub_id } = req.query;
  if (!pub_id) return res.status(400).json({ error: "missing pub_id" });

  try {
    // try to find tracking rows for this pub_id
    const q = `
      SELECT id, pub_code, publisher_id, publisher_name, geo, carrier, type, tracking_url,
             pin_send_url, pin_verify_url, check_status_url, portal_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
      LIMIT 200
    `;
    const { rows } = await pool.query(q, [pub_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "not_found", message: "no tracking rows for this pub_id" });
    }

    // pick first row as canonical publisher data (but also collect distinct geo/carrier combos)
    const publisher = {
      pub_id,
      publisher_id: rows[0].publisher_id || null,
      publisher_name: rows[0].publisher_name || null,
      sample_type: rows[0].type || null,
    };

    const combos = [...new Map(rows.map(r => [`${r.geo}||${r.carrier}`, { geo: r.geo, carrier: r.carrier }])).values()];

    return res.json({ publisher, combos, tracking_rows: rows.slice(0, 50) });
  } catch (err) {
    console.error("distribution.meta error:", err);
    return res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

/**
 * GET /api/distribution/offers?geo=IQ&carrier=Zain
 * Returns active offers filtered by geo and carrier.
 * Assumes offers table contains columns: id, code, name, advertiser, geo, carrier, status
 */
router.get("/offers", async (req, res) => {
  const { geo, carrier } = req.query;
  try {
    const q = `
      SELECT id, code AS offer_code, name AS offer_name, advertiser_name, type, status
      FROM offers
      WHERE status = 'active'
        AND ($1::text IS NULL OR geo = $1)
        AND ($2::text IS NULL OR carrier = $2)
      ORDER BY name
      LIMIT 500
    `;
    const { rows } = await pool.query(q, [geo || null, carrier || null]);
    res.json(rows);
  } catch (err) {
    console.error("distribution.offers error:", err);
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

/**
 * GET /api/distribution/rules?pub_id=PUB01
 * List existing rules for a publisher
 */
router.get("/rules", async (req, res) => {
  const { pub_id } = req.query;
  try {
    const q = `
      SELECT tr.*, o.code AS offer_code, o.name AS offer_name, o.advertiser_name
      FROM traffic_rules tr
      LEFT JOIN offers o ON o.id = tr.offer_id
      WHERE tr.pub_id = $1
      ORDER BY tr.id;
    `;
    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows || []);
  } catch (err) {
    console.error("distribution.rules.list error:", err);
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

/**
 * POST /api/distribution/rules
 * Body: { pub_id, publisher_id, publisher_name, offer_id, geo, carrier, weight, tracking_link_id, type }
 */
router.post("/rules", async (req, res) => {
  const {
    pub_id, publisher_id, publisher_name,
    offer_id, offer_code, offer_name, advertiser_name,
    geo, carrier, weight, tracking_link_id, type
  } = req.body;

  if (!pub_id || !offer_id || !geo || !carrier || !tracking_link_id) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    // Prevent duplicate offer selection for same pub+geo+carrier if you want:
    const dupQ = `SELECT id FROM traffic_rules WHERE pub_id=$1 AND offer_id=$2 AND geo=$3 AND carrier=$4 LIMIT 1`;
    const dup = (await pool.query(dupQ, [pub_id, offer_id, geo, carrier])).rows[0];
    if (dup) return res.status(409).json({ error: "duplicate", message: "offer already configured for this pub+geo+carrier" });

    const insertQ = `
      INSERT INTO traffic_rules
        (pub_id, publisher_id, publisher_name, offer_id, offer_code, offer_name, advertiser_name,
         tracking_link_id, geo, carrier, weight, type, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',now())
      RETURNING *;
    `;
    const values = [pub_id, publisher_id || null, publisher_name || null,
                    offer_id, offer_code || null, offer_name || null, advertiser_name || null,
                    tracking_link_id, geo, carrier, weight || 100, type || null];
    const { rows } = await pool.query(insertQ, values);
    res.json(rows[0]);
  } catch (err) {
    console.error("distribution.rules.create error:", err);
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

/**
 * PUT /api/distribution/rules/:id  -- update weight/status etc.
 */
router.put("/rules/:id", async (req, res) => {
  const id = req.params.id;
  const { weight, status } = req.body;
  try {
    const q = `UPDATE traffic_rules SET weight=$1, status=$2, updated_at=now() WHERE id=$3 RETURNING *`;
    const { rows } = await pool.query(q, [weight || 100, status || 'active', id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("distribution.rules.update error:", err);
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

/**
 * DELETE /api/distribution/rules/:id
 */
router.delete("/rules/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM traffic_rules WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("distribution.rules.delete error:", err);
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

export default router;
