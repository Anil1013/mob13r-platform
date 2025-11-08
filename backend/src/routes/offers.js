import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* 🟢 List all offers with advertiser + geo/carrier info */
router.get("/", authJWT, async (req, res) => {
  try {
    const q = `
      SELECT o.*, a.name AS advertiser_name
      FROM offers o
      LEFT JOIN advertisers a ON o.advertiser_id = a.id
      ORDER BY o.id DESC
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("GET /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* 🟡 Create offer */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      advertiser_id,
      name,
      type,
      payout,
      tracking_url,
      landing_url,
      cap_daily,
      cap_total,
      status,
      targets,
    } = req.body;

    const offer = await pool.query(
      `INSERT INTO offers (advertiser_id, name, type, payout, tracking_url, landing_url, cap_daily, cap_total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        advertiser_id,
        name,
        type,
        payout,
        tracking_url,
        landing_url,
        cap_daily || null,
        cap_total || null,
        status || "active",
      ]
    );

    const offerId = offer.rows[0].id;

    // Add targeting (geo + carrier)
    if (Array.isArray(targets) && targets.length) {
      for (const t of targets) {
        await pool.query(
          `INSERT INTO offer_targets (offer_id, geo, carrier)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [offerId, t.geo, t.carrier || null]
        );
      }
    }

    res.status(201).json(offer.rows[0]);
  } catch (err) {
    console.error("POST /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* 🟣 Update offer */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      payout,
      tracking_url,
      landing_url,
      cap_daily,
      cap_total,
      status,
      targets,
    } = req.body;

    const result = await pool.query(
      `UPDATE offers
       SET name=$1, type=$2, payout=$3, tracking_url=$4, landing_url=$5,
           cap_daily=$6, cap_total=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [
        name,
        type,
        payout,
        tracking_url,
        landing_url,
        cap_daily,
        cap_total,
        status,
        id,
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Offer not found" });

    // update targets if given
    if (Array.isArray(targets)) {
      await pool.query("DELETE FROM offer_targets WHERE offer_id=$1", [id]);
      for (const t of targets) {
        await pool.query(
          "INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3)",
          [id, t.geo, t.carrier]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /offers/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* 🔁 Get offers for publisher (with allocation %) */
router.get("/publisher/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT po.geo, po.carrier, po.percent, o.*, a.name as advertiser_name
      FROM publisher_offer_allocations po
      JOIN offers o ON o.id = po.offer_id
      JOIN advertisers a ON a.id = o.advertiser_id
      WHERE po.publisher_id = $1
      ORDER BY po.geo, po.carrier, o.id
    `;
    const { rows } = await pool.query(q, [id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /offers/publisher/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
