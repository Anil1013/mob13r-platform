// backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ===================================================================
   HELPERS
=================================================================== */

const norm = (v) =>
  !v || v.trim() === "" ? "ALL" : v.trim().toUpperCase();

// TOTAL WEIGHT CALCULATOR
async function getTotalWeight(pubId, trackingLinkId, excludeId = null) {
  let params = [pubId, trackingLinkId];
  let where = `pub_id = $1 AND tracking_link_id = $2 AND status = 'active'`;

  if (excludeId) {
    params.push(excludeId);
    where += ` AND id <> $${params.length}`;
  }

  const q = `
    SELECT COALESCE(SUM(weight), 0) AS total_weight
    FROM distribution_rules
    WHERE ${where}
  `;

  const { rows } = await pool.query(q, params);
  return Number(rows[0].total_weight || 0);
}

// OFFER CAP STATS
async function getOfferCapStats(offerId, pubId, geo, carrier) {
  const qOffer = `
    SELECT id, name, cap_daily, cap_total, status
    FROM offers
    WHERE id = $1
    LIMIT 1
  `;
  const offerRes = await pool.query(qOffer, [offerId]);
  if (!offerRes.rows[0]) return null;

  const offer = offerRes.rows[0];

  const qConv = `
    SELECT
      COALESCE(SUM(CASE WHEN created_at::date = CURRENT_DATE THEN 1 ELSE 0 END),0) AS today,
      COALESCE(COUNT(*),0) AS total
    FROM conversions
    WHERE offer_id = $1
      AND pub_id = $2
      AND ($3 = 'ALL' OR UPPER(geo) = $3)
      AND ($4 = 'ALL' OR UPPER(carrier) = $4)
      AND status IN ('approved','confirmed')
  `;
  const convRes = await pool.query(qConv, [
    offerId,
    pubId,
    geo.toUpperCase(),
    carrier.toUpperCase(),
  ]);

  const today = Number(convRes.rows[0].today || 0);
  const total = Number(convRes.rows[0].total || 0);

  const dailyCap = Number(offer.cap_daily || 0);
  const totalCap = Number(offer.cap_total || 0);

  const cappedDaily = dailyCap > 0 && today >= dailyCap;
  const cappedTotal = totalCap > 0 && total >= totalCap;

  return {
    offer_id: offer.id,
    offer_name: offer.name,
    cap_daily: dailyCap,
    cap_total: totalCap,
    used_today: today,
    used_total: total,
    is_capped: cappedDaily || cappedTotal || offer.status !== "active",
  };
}

/* ===================================================================
   1) TRACKING LINKS (publisher_tracking_links)
=================================================================== */

router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id)
      return res.status(400).json({ success: false, error: "pub_id_required" });

    const q = `
      SELECT
        id AS tracking_link_id,
        pub_code,
        publisher_id,
        publisher_name,
        name,
        geo,
        carrier,
        type,
        payout,
        cap_daily,
        cap_total,
        tracking_url,
        status
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);

    const links = rows.map((r) => ({
      tracking_link_id: r.tracking_link_id,
      pub_code: r.pub_code,
      publisher_id: r.publisher_id,
      publisher_name: r.publisher_name,
      name: r.name,
      geo: r.geo,
      carrier: r.carrier,
      type: r.type,
      payout: r.payout,
      cap_daily: r.cap_daily,
      cap_total: r.cap_total,
      tracking_url: r.tracking_url,
      status: r.status,

      tracking_id: `${r.pub_code}-${r.geo}-${r.carrier}`,
      base_url: r.tracking_url,
    }));

    res.json({ success: true, links });
  } catch (err) {
    console.error("tracking-links error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   2) META (simple)
=================================================================== */

router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id || !tracking_link_id)
      return res
        .status(400)
        .json({ success: false, error: "pub_id_tracking_link_id_required" });

    const q = `
      SELECT *
      FROM publisher_tracking_links
      WHERE pub_code = $1 AND id = $2
      LIMIT 1
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);
    if (!rows[0])
      return res.json({ success: false, error: "tracking_not_found" });

    const r = rows[0];

    const meta = {
      tracking_link_id: r.id,
      pub_code: r.pub_code,
      geo: r.geo,
      carrier: r.carrier,
      tracking_url: r.tracking_url,

      total_hit: null,
      remaining_hit: null,
    };

    res.json({ success: true, meta });
  } catch (err) {
    console.error("meta error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   3) GET RULES
=================================================================== */

router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id || !tracking_link_id)
      return res
        .status(400)
        .json({ success: false, error: "pub_id_tracking_link_id_required" });

    const q = `
      SELECT *
      FROM distribution_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
        AND status <> 'deleted'
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    res.json({ success: true, rules: rows });
  } catch (err) {
    console.error("rules error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   4) REMAINING %
=================================================================== */

router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id || !tracking_link_id)
      return res
        .status(400)
        .json({ success: false, error: "pub_id_tracking_link_id_required" });

    const total = await getTotalWeight(pub_id, tracking_link_id);
    res.json({ success: true, remaining: 100 - total });
  } catch (err) {
    console.error("remaining error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   5) ADD RULE
=================================================================== */

router.post("/rules", authJWT, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      pub_id,
      tracking_link_id,
      offer_id,
      weight,
      geo,
      carrier,
      is_fallback,
      autoFill,
    } = req.body;

    if (!pub_id || !tracking_link_id || !offer_id) {
      return res.status(400).json({
        success: false,
        error: "pub_id_tracking_link_id_offer_id_required",
      });
    }

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    await client.query("BEGIN");

    // --- DUPLICATE CHECK ---
    const dupQ = `
      SELECT id
      FROM distribution_rules
      WHERE pub_id=$1
        AND tracking_link_id=$2
        AND offer_id=$3
        AND UPPER(geo)=$4
        AND UPPER(carrier)=$5
        AND status <> 'deleted'
    `;

    const dup = await client.query(dupQ, [
      pub_id,
      tracking_link_id,
      offer_id,
      nGeo,
      nCarrier,
    ]);

    if (dup.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({
        success: false,
        error: "duplicate_rule",
      });
    }

    // --- SMART AUTO FILL ---
    let finalWeight = Number(weight);
    if (autoFill || !finalWeight) {
      const total = await getTotalWeight(pub_id, tracking_link_id);
      finalWeight = Math.max(100 - total, 0);
    }

    // --- WEIGHT VALIDATION ---
    const totalNow = await getTotalWeight(pub_id, tracking_link_id);
    if (totalNow + finalWeight > 100) {
      await client.query("ROLLBACK");
      return res.json({
        success: false,
        error: "weight_exceeded",
      });
    }

    // --- INSERT RULE ---
    const insertQ = `
      INSERT INTO distribution_rules
        (pub_id, tracking_link_id, offer_id, weight, geo, carrier, is_fallback, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'active')
      RETURNING *
    `;

    const result = await client.query(insertQ, [
      pub_id,
      tracking_link_id,
      offer_id,
      finalWeight,
      nGeo,
      nCarrier,
      Boolean(is_fallback),
    ]);

    await client.query("COMMIT");
    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("add rule error", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/* ===================================================================
   6) UPDATE RULE
=================================================================== */

router.put("/rules/:id", authJWT, async (req, res) => {
  const client = await pool.connect();

  try {
    const id = req.params.id;
    const {
      pub_id,
      tracking_link_id,
      offer_id,
      weight,
      geo,
      carrier,
      is_fallback,
      status,
      autoFill,
    } = req.body;

    if (!pub_id || !tracking_link_id || !offer_id) {
      return res.json({
        success: false,
        error: "pub_id_tracking_link_id_offer_id_required",
      });
    }

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    await client.query("BEGIN");

    // DUPLICATE CHECK
    const dupQ = `
      SELECT id
      FROM distribution_rules
      WHERE pub_id=$1
        AND tracking_link_id=$2
        AND offer_id=$3
        AND UPPER(geo)=$4
        AND UPPER(carrier)=$5
        AND id <> $6
        AND status <> 'deleted'
    `;
    const dup = await client.query(dupQ, [
      pub_id,
      tracking_link_id,
      offer_id,
      nGeo,
      nCarrier,
      id,
    ]);

    if (dup.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({
        success: false,
        error: "duplicate_rule",
      });
    }

    // SMART AUTO FILL
    let finalWeight = Number(weight);
    if (autoFill || !finalWeight) {
      const total = await getTotalWeight(pub_id, tracking_link_id, id);
      finalWeight = Math.max(100 - total, 0);
    }

    // TOTAL VALIDATION
    const totalNow = await getTotalWeight(pub_id, tracking_link_id, id);
    if (totalNow + finalWeight > 100) {
      await client.query("ROLLBACK");
      return res.json({
        success: false,
        error: "weight_exceeded",
      });
    }

    // UPDATE
    const updateQ = `
      UPDATE distribution_rules
      SET offer_id=$1, weight=$2, geo=$3, carrier=$4,
          is_fallback=$5, status=$6
      WHERE id=$7
      RETURNING *
    `;

    const result = await client.query(updateQ, [
      offer_id,
      finalWeight,
      nGeo,
      nCarrier,
      Boolean(is_fallback),
      status || "active",
      id,
    ]);

    await client.query("COMMIT");
    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("update rule error", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/* ===================================================================
   7) DELETE RULE
=================================================================== */

router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const q = `
      UPDATE distribution_rules
      SET status='deleted'
      WHERE id=$1
    `;

    await pool.query(q, [id]);

    res.json({ success: true });
  } catch (err) {
    console.error("delete rule error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   8) ROTATION PREVIEW (cap + fallback logic)
=================================================================== */

router.get("/rotation/preview", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier } = req.query;
    if (!pub_id || !tracking_link_id)
      return res.json({
        success: false,
        error: "pub_id_tracking_link_id_required",
      });

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    const q = `
      SELECT *
      FROM distribution_rules
      WHERE pub_id=$1
        AND tracking_link_id=$2
        AND status='active'
      ORDER BY id ASC
    `;

    const { rows: rules } = await pool.query(q, [pub_id, tracking_link_id]);

    if (!rules.length)
      return res.json({
        success: true,
        selected_offer: null,
        reason: "no_rules",
      });

    const eligible = [];
    const fallbacks = [];

    for (const r of rules) {
      const rGeo = norm(r.geo);
      const rCarrier = norm(r.carrier);

      if (rGeo !== "ALL" && rGeo !== nGeo) continue;
      if (rCarrier !== "ALL" && rCarrier !== nCarrier) continue;

      const cap = await getOfferCapStats(
        r.offer_id,
        pub_id,
        nGeo,
        nCarrier
      );

      if (!cap || cap.is_capped) {
        if (r.is_fallback) fallbacks.push({ rule: r });
        continue;
      }

      if (r.is_fallback) fallbacks.push({ rule: r });
      else eligible.push({ rule: r });
    }

    let selected = null;
    let type = null;

    if (eligible.length) {
      const sum = eligible.reduce(
        (a, b) => a + Number(b.rule.weight),
        0
      );
      let rnd = Math.random() * sum;

      for (const e of eligible) {
        rnd -= Number(e.rule.weight);
        if (rnd <= 0) {
          selected = e.rule;
          type = "primary";
          break;
        }
      }
    } else if (fallbacks.length) {
      const sum = fallbacks.reduce(
        (a, b) => a + Number(b.rule.weight),
        0
      );
      let rnd = Math.random() * sum;

      for (const f of fallbacks) {
        rnd -= Number(f.rule.weight);
        if (rnd <= 0) {
          selected = f.rule;
          type = "fallback";
          break;
        }
      }
    }

    res.json({
      success: true,
      selected,
      type,
    });
  } catch (err) {
    console.error("preview error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   EXPORT
=================================================================== */
export default router;
