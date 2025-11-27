// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/*
  ===========================================================
  TRAFFIC DISTRIBUTION + CLICK LOGGING
  ===========================================================
  • META (tracking links)
  • OFFERS
  • RULES (list + delete)
  • CLICK ROTATION (smart)
  • CLICK LOG INSERT → analytics_clicks
  ===========================================================
*/

/* Small helpers */
const norm = (v) => (v || "").trim().toUpperCase();
const splitList = (str) =>
  (str || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.toUpperCase());

const isAnyToken = (list) =>
  !list.length ||
  list.includes("ANY") ||
  list.includes("ALL") ||
  list.includes("*");

/**
 * Smart scoring for a rule vs requested geo/carrier
 *
 * Score priority:
 *  3 → exact GEO & exact CARRIER
 *  2 → exact GEO, any carrier
 *  1 → any geo, exact CARRIER
 *  0 → any geo, any carrier
 */
function scoreRule(rule, reqGeo, reqCarrier) {
  const g = norm(reqGeo);
  const c = norm(reqCarrier);

  const ruleGeos = splitList(rule.geo);
  const ruleCarriers = splitList(rule.carrier);

  const anyGeo = isAnyToken(ruleGeos);
  const anyCarrier = isAnyToken(ruleCarriers);

  const geoMatch = anyGeo || ruleGeos.includes(g);
  const carrierMatch = anyCarrier || ruleCarriers.includes(c);

  if (!geoMatch && !carrierMatch) return null; // no match at all

  let score = 0;
  if (!anyGeo && !anyCarrier && geoMatch && carrierMatch) score = 3;
  else if (!anyGeo && geoMatch && anyCarrier) score = 2;
  else if (!anyCarrier && carrierMatch && anyGeo) score = 1;
  else score = 0; // any/any

  const weight = Number(rule.weight) || 0;

  return { score, weight };
}

/* ===========================================================
   META  → Load Publisher Tracking Links
   =========================================================== */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const q = `
      SELECT id AS tracking_link_id,
             pub_code,
             publisher_id,
             publisher_name,
             geo,
             carrier,
             type,
             tracking_url,
             status
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);
  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   ACTIVE OFFERS
   =========================================================== */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    let q = `
      SELECT id,
             offer_id,
             name AS offer_name,
             advertiser_name,
             type,
             payout,
             tracking_url,
             status
      FROM offers
      WHERE status = 'active'
    `;

    const params = [];

    if (exclude) {
      const ids = exclude
        .split(",")
        .map(Number)
        .filter(Boolean);
      if (ids.length) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
        q += ` AND id NOT IN (${placeholders})`;
        params.push(...ids);
      }
    }

    q += " ORDER BY id ASC";

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   RULES LIST
   =========================================================== */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY id ASC
    `;
    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);
  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   DELETE RULE  (for UI "delete" button)
   =========================================================== */
router.delete("/rules/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });

    const q = `DELETE FROM traffic_rules WHERE id = $1`;
    await pool.query(q, [id]);

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   GLOBAL OVERVIEW
   =========================================================== */
router.get("/overview", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM traffic_rules
      ORDER BY pub_id ASC, id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("OVERVIEW ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   CLICK ROTATION + CLICK LOGGING (SMART)
   =========================================================== */
router.get("/click", fraudCheck, async (req, res) => {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.status(400).send("missing params");
    }

    const normPub = pub_id.toUpperCase();

    // 1) Fetch all ACTIVE rules for this pub
    const rulesSQL = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
        AND status = 'active'
    `;
    const { rows: rules } = await pool.query(rulesSQL, [normPub]);

    if (!rules.length) {
      console.warn("No active rules for pub:", normPub);
      return res.redirect("https://google.com");
    }

    // 2) Score rules (smart matching)
    let bestRule = null;
    let bestScore = -1;
    let bestWeight = -1;

    for (const rule of rules) {
      const scored = scoreRule(rule, geo, carrier);
      if (!scored) continue;

      if (
        scored.score > bestScore ||
        (scored.score === bestScore && scored.weight > bestWeight)
      ) {
        bestRule = rule;
        bestScore = scored.score;
        bestWeight = scored.weight;
      }
    }

    // 3) Fallbacks if no match at all → choose highest weight among all
    if (!bestRule) {
      console.warn(
        "No geo/carrier match for",
        { pub_id, geo, carrier },
        "→ fallback to highest weight rule"
      );
      bestRule =
        rules.reduce((max, r) => {
          const w = Number(r.weight) || 0;
          if (!max || w > (Number(max.weight) || 0)) return r;
          return max;
        }, null) || rules[0];
    }

    const selected = bestRule;

    /* ======================================================
       LOG CLICK INTO analytics_clicks TABLE
       (same table used by analyticsClicks.js)
       ====================================================== */
    try {
      const ip =
        (req.headers["x-forwarded-for"] || "")
          .split(",")[0]
          .trim() || req.ip;

      await pool.query(
        `
          INSERT INTO analytics_clicks
            (pub_id, offer_id, geo, carrier, ip, ua, referer, params)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          normPub,
          selected.offer_id,
          geo,
          carrier,
          ip,
          req.headers["user-agent"] || null,
          req.headers["referer"] || null,
          req.query ? JSON.stringify(req.query) : null,
        ]
      );
    } catch (err) {
      console.error("CLICK LOGGING ERROR:", err);
      // do not block redirect
    }

    /* ======================================================
       FINAL REDIRECT (append click_id if provided)
       ====================================================== */
    let finalUrl = selected.redirect_url;

    if (!finalUrl) {
      console.warn("Selected rule has no redirect_url, pub:", normPub);
      return res.redirect("https://google.com");
    }

    if (click_id) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `click_id=${click_id}`;
    }

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://google.com");
  }
});

export default router;
