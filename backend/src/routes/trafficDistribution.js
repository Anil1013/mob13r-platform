// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * GET /api/distribution
 * Query : pub_id, geo, carrier
 * returns all distribution rows (admin view)
 */
router.get("/", authJWT, async (req, res) => {
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
    console.error("GET /api/distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/distribution
 * body: { pub_id, geo, carrier, offer_id, percentage, sequence_order }
 * Validations: <=5 rows for that pub+geo+carrier, total percentage <=100
 */
router.post("/", authJWT, async (req, res) => {
  try {
    const { pub_id, geo, carrier, offer_id, percentage = 0, sequence_order = 0 } = req.body;
    if (!pub_id || !geo || !carrier || !offer_id || !percentage) {
      return res.status(400).json({ error: "pub_id, geo, carrier, offer_id and percentage required" });
    }

    // Count existing
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
    console.error("POST /api/distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/distribution/:id - update percentage / sequence / offer
 */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const { offer_id, percentage, sequence_order } = req.body;

    // load existing row to get pub_id/geo/carrier
    const r = await pool.query("SELECT * FROM publisher_distributions WHERE id=$1", [id]);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    const row = r.rows[0];

    // If percentage changed, validate sum
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
    console.error("PUT /api/distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/distribution/:id
 */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM publisher_distributions WHERE id=$1", [req.params.id]);
    res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE /api/distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   Selection endpoint used by click router:
   GET /api/distribution/select?pub_id=&geo=&carrier=
   Returns chosen offer_id according to distribution percentages; 
   if chosen offer is capped -> fallback logic
   ============================================================ */
router.get("/select", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;
    if (!pub_id || !geo || !carrier) return res.status(400).json({ error: "pub_id, geo, carrier required" });

    // 1) load distributions for this pub+geo+carrier
    const { rows: drows } = await pool.query(
      `SELECT d.*, o.status as offer_status
       FROM publisher_distributions d
       LEFT JOIN offers o ON o.offer_id = d.offer_id
       WHERE d.pub_id=$1 AND d.geo=$2 AND d.carrier=$3
       ORDER BY d.sequence_order, d.id`,
      [pub_id, geo, carrier]
    );

    if (!drows.length) return res.status(404).json({ error: "No distribution configured" });

    // 2) pick according to percentage (weighted random)
    const total = drows.reduce((s, r) => s + (r.percentage || 0), 0);
    // If total <100 - we still pick proportionally
    let pick = Math.floor(Math.random() * total) + 1;
    let chosen = null;
    for (const r of drows) {
      pick -= r.percentage;
      if (pick <= 0) { chosen = r; break; }
    }
    if (!chosen) chosen = drows[drows.length - 1];

    // 3) check cap of chosen offer. We'll check cap_total and cap_daily using conversions table
    const offerId = chosen.offer_id;

    const offerRow = await pool.query("SELECT cap_daily, cap_total, status FROM offers WHERE offer_id=$1", [offerId]);
    if (!offerRow.rows.length) return res.status(404).json({ error: "Selected offer missing" });
    const of = offerRow.rows[0];

    // helper: count conversions total and today for this offer
    const countTotalRes = await pool.query("SELECT COUNT(*)::int AS c FROM conversions WHERE offer_id=$1", [offerId]);
    const countTodayRes = await pool.query("SELECT COUNT(*)::int AS c FROM conversions WHERE offer_id=$1 AND created_at::date = NOW()::date", [offerId]);
    const totalCount = countTotalRes.rows[0].c;
    const todayCount = countTodayRes.rows[0].c;

    // compare
    const overTotal = of.cap_total && of.cap_total > 0 ? (totalCount >= of.cap_total) : false;
    const overDaily = of.cap_daily && of.cap_daily > 0 ? (todayCount >= of.cap_daily) : false;

    if (!overTotal && !overDaily && of.status === 'active') {
      return res.json({ offer_id: offerId, reason: "chosen" });
    }

    // 4) fallback: find offers in same geo+carrier with is_fallback=true and status active
    const fallbackQuery = `
      SELECT o.offer_id
      FROM offers o
      JOIN offer_targets t ON t.offer_id = o.offer_id
      WHERE t.geo = $1 AND t.carrier = $2 AND o.is_fallback = true AND o.status = 'active'
      ORDER BY o.id
    `;
    const fb = await pool.query(fallbackQuery, [geo, carrier]);
    if (!fb.rows.length) {
      // if no fallback, respond with info (no offer)
      return res.status(404).json({ error: "Selected offer capped and no fallback available" });
    }

    // If multiple fallbacks, rotate using fallback_rotation table (choose least recently used)
    const fallbackIds = fb.rows.map(r => r.offer_id);
    // find least recently used among fallback_rotation or pick first
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
      // no rotation entry yet — pick first fallback
      chosenFallback = fallbackIds[0];
      // insert rotation rows for all fallback offers
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

    // update last_used for chosenFallback
    await pool.query(`UPDATE fallback_rotation SET last_used = NOW() WHERE geo=$1 AND carrier=$2 AND offer_id=$3`, [geo, carrier, chosenFallback]);

    return res.json({ offer_id: chosenFallback, reason: "fallback" });

  } catch (err) {
    console.error("GET /api/distribution/select error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
