import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   🟢 GET ALL DISTRIBUTIONS (Admin view)
   ====================================================== */
router.get("/", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    let q = `
      SELECT d.*, p.name AS publisher_name, o.name as offer_name, o.advertiser_name
      FROM publisher_distributions d
      LEFT JOIN publishers p ON p.id = d.pub_id
      LEFT JOIN offers o ON o.offer_id = d.offer_id
      WHERE 1=1
    `;
    const params = [];

    if (pub_id) {
      params.push(pub_id);
      q += ` AND d.pub_id = $${params.length}`;
    }

    q += " ORDER BY d.pub_id, d.geo, d.carrier, d.sequence_order, d.id";

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/trafficDistribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟡 FETCH GEO + CARRIER for selected PUB_ID
   ====================================================== */
router.get("/geo-carrier/:pub_id", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.params;

    const q = `
      SELECT DISTINCT geo, carrier
      FROM publisher_tracking_links
      WHERE publisher_id = $1
      ORDER BY geo, carrier
    `;
    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/trafficDistribution/geo-carrier error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟢 FETCH ACTIVE OFFERS for GEO + CARRIER
   ====================================================== */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const { geo, carrier } = req.query;
    if (!geo || !carrier)
      return res.status(400).json({ error: "geo and carrier required" });

    const q = `
      SELECT DISTINCT o.offer_id, o.name, o.advertiser_name
      FROM offers o
      JOIN offer_targets t ON t.offer_id = o.offer_id
      WHERE t.geo = $1 AND t.carrier = $2 AND o.status = 'active'
      ORDER BY o.name ASC
    `;
    const { rows } = await pool.query(q, [geo, carrier]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/trafficDistribution/offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟢 ADD NEW DISTRIBUTION
   ====================================================== */
router.post("/", authJWT, async (req, res) => {
  try {
    const { pub_id, geo, carrier, offer_id, percentage = 0 } = req.body;
    if (!pub_id || !geo || !carrier || !offer_id)
      return res.status(400).json({ error: "Missing required fields" });

    const { rows: countRows } = await pool.query(
      `SELECT COALESCE(SUM(percentage),0)::int AS sum_p
       FROM publisher_distributions
       WHERE pub_id=$1 AND geo=$2 AND carrier=$3`,
      [pub_id, geo, carrier]
    );
    const { sum_p } = countRows[0];

    if (sum_p + percentage > 100)
      return res.status(400).json({ error: "Total percentage exceeds 100%" });

    const insert = await pool.query(
      `INSERT INTO publisher_distributions
       (pub_id, geo, carrier, offer_id, percentage, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING *`,
      [pub_id, geo, carrier, offer_id, percentage]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("POST /api/trafficDistribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟠 UPDATE DISTRIBUTION
   ====================================================== */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { offer_id, percentage } = req.body;

    const upd = await pool.query(
      `UPDATE publisher_distributions
       SET offer_id = COALESCE($1, offer_id),
           percentage = COALESCE($2, percentage),
           updated_at = NOW()
       WHERE id=$3
       RETURNING *`,
      [offer_id || null, percentage || null, id]
    );

    res.json(upd.rows[0]);
  } catch (err) {
    console.error("PUT /api/trafficDistribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🔴 DELETE DISTRIBUTION
   ====================================================== */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM publisher_distributions WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE /api/trafficDistribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
