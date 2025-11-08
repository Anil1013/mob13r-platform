// backend/src/routes/offers.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js"; // reuse your auth or remove for public endpoints
const router = express.Router();

/* List offers (admin) */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, a.company_name as advertiser_name
      FROM offers o
      LEFT JOIN advertisers a ON a.id = o.advertiser_id
      ORDER BY o.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /offers error", err);
    res.status(500).json({ error: err.message });
  }
});

/* Create offer */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      advertiser_id, name, type, payout,
      tracking_url, landing_url, cap_daily, cap_total, status,
      targets // optional array of {geo, carrier}
    } = req.body;

    const q = await pool.query(`
      INSERT INTO offers (advertiser_id, name, type, payout, tracking_url, landing_url, cap_daily, cap_total, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [advertiser_id, name, type, payout, tracking_url, landing_url, cap_daily, cap_total, status || 'active']);

    const offer = q.rows[0];

    if (Array.isArray(targets) && targets.length) {
      const insertTargets = targets.map(t => pool.query(
        `INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [offer.id, t.geo, t.carrier || null]
      ));
      await Promise.all(insertTargets);
    }

    res.status(201).json(offer);
  } catch (err) {
    console.error("POST /offers error", err);
    res.status(500).json({ error: err.message });
  }
});

/* Update offer */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, type, payout, tracking_url, landing_url, cap_daily, cap_total, status, targets } = req.body;
    const q = await pool.query(`
      UPDATE offers
      SET name=$1, type=$2, payout=$3, tracking_url=$4, landing_url=$5, cap_daily=$6, cap_total=$7, status=$8, updated_at=NOW()
      WHERE id=$9 RETURNING *
    `, [name, type, payout, tracking_url, landing_url, cap_daily, cap_total, status || 'active', id]);

    if (q.rows.length === 0) return res.status(404).json({ error: "Offer not found" });

    // replace targets if provided
    if (Array.isArray(targets)) {
      await pool.query('DELETE FROM offer_targets WHERE offer_id=$1', [id]);
      for (const t of targets) {
        await pool.query('INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, t.geo, t.carrier || null]);
      }
    }

    res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /offers/:id error", err);
    res.status(500).json({ error: err.message });
  }
});

/* Serve offer for click - allocation + cap checks + fallback
   Request body expects: { publisher_id, geo, carrier }
   Response: { offer, redirect_url, tracking_url_template }
*/
router.post("/serve", async (req, res) => {
  try {
    const { publisher_id, geo, carrier } = req.body;

    // 1) fetch publisher allocations for geo/carrier
    const allocSql = `
      SELECT po.offer_id, po.pct, o.cap_daily, o.cap_total, o.tracking_url, o.landing_url
      FROM publisher_offer_allocations po
      JOIN offers o ON o.id = po.offer_id
      WHERE po.publisher_id=$1 AND po.geo=$2 AND (po.carrier=$3 OR po.carrier IS NULL) AND o.status='active'
      ORDER BY po.offer_id;
    `;
    const allocRes = await pool.query(allocSql, [publisher_id, geo, carrier]);

    const allocs = allocRes.rows;

    // If no publisher-specific allocations, find generic offers for geo/carrier
    if (allocs.length === 0) {
      const genericSql = `
        SELECT o.* FROM offers o
        JOIN offer_targets t ON t.offer_id=o.id
        WHERE (t.geo=$1 OR t.geo IS NULL) AND (t.carrier=$2 OR t.carrier IS NULL) AND o.status='active'
        ORDER BY o.id;
      `;
      const gen = await pool.query(genericSql, [geo, carrier]);
      // map to simple structure with equal percentages
      const n = gen.rows.length;
      if (n === 0) return res.status(404).json({ error: "No offers available" });
      allocs.push(...gen.rows.map((r, i) => ({ offer_id: r.id, pct: Math.floor(100/n), cap_daily: r.cap_daily, cap_total: r.cap_total, tracking_url: r.tracking_url, landing_url: r.landing_url })));
    }

    // Helper: check if offer exceeded cap (daily or total)
    async function isOfferCapped(offer_id) {
      // total conversions count where offer_id
      const totQ = await pool.query('SELECT COUNT(*)::int AS total_count FROM conversions WHERE offer_id=$1', [offer_id]);
      const total_count = totQ.rows[0].total_count;
      const dayQ = await pool.query(`SELECT COUNT(*)::int as day_count FROM conversions WHERE offer_id=$1 AND created_at::date = CURRENT_DATE`, [offer_id]);
      const day_count = dayQ.rows[0].day_count;
      const oRow = await pool.query('SELECT cap_total, cap_daily FROM offers WHERE id=$1', [offer_id]);
      const o = oRow.rows[0] || {};
      if (o.cap_total && total_count >= o.cap_total) return true;
      if (o.cap_daily && day_count >= o.cap_daily) return true;
      // publisher specific cap check optional: skip here for brevity
      return false;
    }

    // Weighted random selection based on allocation pct, but skip capped offers.
    const candidates = [];
    for (const a of allocs) {
      const capped = await isOfferCapped(a.offer_id);
      if (!capped) {
        // push a.offer_id pct times to weight
        const weight = Math.max(1, Math.floor(a.pct)); // at least 1
        for (let i = 0; i < weight; i++) candidates.push(a.offer_id);
      }
    }

    // If no candidates (all capped), try fallback chain per offer allocations
    if (candidates.length === 0) {
      // look for fallback offers of allocated offers
      const fallbackQuery = `
        SELECT f.source_offer, f.fallback_offer
        FROM offer_fallbacks f
        WHERE f.source_offer = ANY($1::int[])
        ORDER BY f.priority ASC
      `;
      const allocatedIds = allocs.map(a => a.offer_id);
      const fbRes = await pool.query(fallbackQuery, [allocatedIds]);
      for (const fb of fbRes.rows) {
        const stillCapped = await isOfferCapped(fb.fallback_offer);
        if (!stillCapped) {
          candidates.push(fb.fallback_offer);
        }
      }
    }

    if (candidates.length === 0) return res.status(404).json({ error: "No available offers (caps reached)" });

    // choose random from candidates
    const chosenOfferId = candidates[Math.floor(Math.random() * candidates.length)];
    const chosenRow = await pool.query('SELECT * FROM offers WHERE id=$1', [chosenOfferId]);
    const chosen = chosenRow.rows[0];

    // return offer info (frontend or tracker will replace placeholders)
    return res.json({
      offer: {
        id: chosen.id,
        name: chosen.name,
        advertiser_id: chosen.advertiser_id,
        landing_url: chosen.landing_url
      },
      tracking_url_template: chosen.tracking_url
    });

  } catch (err) {
    console.error("POST /offers/serve error", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
