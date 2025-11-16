// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * GET /api/distribution
 * Query params (optional): tracking_link_id, geo, carrier
 * Returns distribution rows with publisher + offer info.
 */
router.get("/", authJWT, async (req, res) => {
  try {
    const { tracking_link_id, geo, carrier } = req.query;
    let q = `
      SELECT d.*, tl.pub_id AS publisher_id, tl.publisher_name, o.name AS offer_name, o.advertiser_name
      FROM publisher_distributions d
      LEFT JOIN publisher_tracking_links tl ON tl.id = d.tracking_link_id
      LEFT JOIN offers o ON o.offer_id = d.offer_id
      WHERE 1=1
    `;
    const params = [];
    if (tracking_link_id) {
      params.push(tracking_link_id);
      q += ` AND d.tracking_link_id = $${params.length}`;
    }
    if (geo) {
      params.push(geo);
      q += ` AND d.geo = $${params.length}`;
    }
    if (carrier) {
      params.push(carrier);
      q += ` AND d.carrier = $${params.length}`;
    }
    q += " ORDER BY d.tracking_link_id, d.geo, d.carrier, d.sequence_order, d.id";
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/distribution
 * Body: { tracking_link_id, offer_id, percentage, sequence_order }
 * validation: <=5 rows per tracking_link_id+geo+carrier, total percentage <= 100
 */
router.post("/", authJWT, async (req, res) => {
  try {
    const { tracking_link_id, offer_id, percentage = 0, sequence_order = 0 } = req.body;
    if (!tracking_link_id || !offer_id || !percentage) {
      return res.status(400).json({ error: "tracking_link_id, offer_id and percentage required" });
    }

    // load tracking link to get pub_id/geo/carrier
    const tl = await pool.query("SELECT * FROM publisher_tracking_links WHERE id=$1", [tracking_link_id]);
    if (!tl.rows.length) return res.status(400).json({ error: "Invalid tracking_link_id" });
    const tracking = tl.rows[0];
    const geo = tracking.geo;
    const carrier = tracking.carrier;
    const pub_id = tracking.pub_id || null;

    // Count existing rows for that tracking_link + geo + carrier
    const cntQ = await pool.query(
      `SELECT COUNT(*)::int AS c, COALESCE(SUM(percentage),0)::int AS sum_p
       FROM publisher_distributions
       WHERE tracking_link_id=$1 AND geo=$2 AND carrier=$3`,
      [tracking_link_id, geo, carrier]
    );
    const { c, sum_p } = cntQ.rows[0];
    if (c >= 5) return res.status(400).json({ error: "Max 5 distribution rows allowed per PUB + geo + carrier" });
    if (sum_p + percentage > 100) return res.status(400).json({ error: "Total percentage exceeds 100" });

    const insert = await pool.query(
      `INSERT INTO publisher_distributions
       (tracking_link_id, pub_id, geo, carrier, offer_id, percentage, sequence_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING *`,
      [tracking_link_id, pub_id, geo, carrier, offer_id, percentage, sequence_order]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("POST /api/distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/distribution/:id
 * body: { offer_id?, percentage?, sequence_order? }
 * Validates percentage sum.
 */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const { offer_id, percentage, sequence_order } = req.body;

    // load existing row
    const r = await pool.query("SELECT * FROM publisher_distributions WHERE id=$1", [id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    const row = r.rows[0];

    // if percentage provided, validate sum excluding this row
    if (typeof percentage === "number") {
      const s = await pool.query(
        `SELECT COALESCE(SUM(percentage),0)::int AS sum_p
         FROM publisher_distributions
         WHERE tracking_link_id=$1 AND geo=$2 AND carrier=$3 AND id <> $4`,
        [row.tracking_link_id, row.geo, row.carrier, id]
      );
      const sumOther = s.rows[0].sum_p;
      if (sumOther + percentage > 100) return res.status(400).json({ error: "Total percentage exceeds 100" });
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
    console.error("PUT /api/distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/distribution/:id
 */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("DELETE FROM publisher_distributions WHERE id=$1", [id]);
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE /api/distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/distribution/offers?geo=&carrier=
 * Returns active offers that target the given geo+carrier
 */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const { geo, carrier } = req.query;
    if (!geo || !carrier) return res.status(400).json({ error: "geo and carrier required" });

    const q = `
      SELECT o.offer_id, o.name, o.payout, o.cap_daily, o.cap_total, o.status, o.is_fallback
      FROM offers o
      JOIN offer_targets t ON t.offer_id = o.offer_id
      WHERE t.geo = $1 AND t.carrier = $2 AND o.status = 'active'
      ORDER BY o.id DESC
    `;
    const { rows } = await pool.query(q, [geo, carrier]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/distribution/offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/distribution/select?tracking_link_id=&geo=&carrier=
 * Selection endpoint used by click router (no auth, public).
 * NOTE: not protected by authJWT because clicks come from public endpoints — keep same as your click route expectation.
 */
router.get("/select", async (req, res) => {
  try {
    const { tracking_link_id, geo, carrier } = req.query;
    if (!tracking_link_id || !geo || !carrier) return res.status(400).json({ error: "tracking_link_id, geo, carrier required" });

    // 1) load distribution rows for this tracking link + geo + carrier (the admin configured splits)
    const { rows: drows } = await pool.query(
      `SELECT d.*, o.status as offer_status
       FROM publisher_distributions d
       LEFT JOIN offers o ON o.offer_id = d.offer_id
       WHERE d.tracking_link_id=$1 AND d.geo=$2 AND d.carrier=$3
       ORDER BY d.sequence_order, d.id`,
      [tracking_link_id, geo, carrier]
    );

    if (!drows.length) return res.status(404).json({ error: "No distribution configured for this PUB/geo/carrier" });

    // Weighted random by percentage
    const total = drows.reduce((s, r) => s + (r.percentage || 0), 0);
    let pick = Math.floor(Math.random() * total) + 1;
    let chosen = null;
    for (const r of drows) {
      pick -= r.percentage;
      if (pick <= 0) { chosen = r; break; }
    }
    if (!chosen) chosen = drows[drows.length - 1];
    const offerId = chosen.offer_id;

    // 2) Check caps & status of chosen offer
    const offerRow = await pool.query("SELECT cap_daily, cap_total, status FROM offers WHERE offer_id=$1", [offerId]);
    if (!offerRow.rows.length) return res.status(404).json({ error: "Selected offer missing" });
    const of = offerRow.rows[0];

    const countTotalRes = await pool.query("SELECT COUNT(*)::int AS c FROM conversions WHERE offer_id=$1", [offerId]);
    const countTodayRes = await pool.query("SELECT COUNT(*)::int AS c FROM conversions WHERE offer_id=$1 AND created_at::date = NOW()::date", [offerId]);
    const totalCount = countTotalRes.rows[0].c;
    const todayCount = countTodayRes.rows[0].c;

    const overTotal = of.cap_total && of.cap_total > 0 ? (totalCount >= of.cap_total) : false;
    const overDaily = of.cap_daily && of.cap_daily > 0 ? (todayCount >= of.cap_daily) : false;

    if (!overTotal && !overDaily && of.status === 'active') {
      return res.json({ offer_id: offerId, reason: "chosen" });
    }

    // 3) Fallback: find fallback offers in same geo+carrier
    const fbQ = `
      SELECT o.offer_id
      FROM offers o
      JOIN offer_targets t ON t.offer_id = o.offer_id
      WHERE t.geo = $1 AND t.carrier = $2 AND o.is_fallback = true AND o.status = 'active'
      ORDER BY o.id
    `;
    const fb = await pool.query(fbQ, [geo, carrier]);
    if (!fb.rows.length) {
      return res.status(404).json({ error: "Selected offer capped and no fallback available" });
    }

    const fallbackIds = fb.rows.map(r => r.offer_id);

    // find least recently used among fallback_rotation rows that match the set
    const fr = await pool.query(
      `SELECT fr.offer_id FROM fallback_rotation fr
       WHERE fr.geo=$1 AND fr.carrier=$2 AND fr.offer_id = ANY($3::text[])
       ORDER BY fr.last_used NULLS FIRST, fr.offer_id
       LIMIT 1`, [geo, carrier, fallbackIds]
    );

    let chosenFallback;
    if (fr.rows.length) {
      chosenFallback = fr.rows[0].offer_id;
    } else {
      chosenFallback = fallbackIds[0];
      // insert rotation rows for all fallback offers if not present
      for (const fid of fallbackIds) {
        try {
          await pool.query(
            `INSERT INTO fallback_rotation (geo, carrier, offer_id, last_used)
             VALUES ($1,$2,$3,NULL)
             ON CONFLICT (geo, carrier, offer_id) DO NOTHING`,
            [geo, carrier, fid]
          );
        } catch (e) { /* ignore */ }
      }
    }

    // update chosen fallback last_used
    await pool.query(`UPDATE fallback_rotation SET last_used = NOW() WHERE geo=$1 AND carrier=$2 AND offer_id=$3`, [geo, carrier, chosenFallback]);

    return res.json({ offer_id: chosenFallback, reason: "fallback" });

  } catch (err) {
    console.error("GET /api/distribution/select error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
