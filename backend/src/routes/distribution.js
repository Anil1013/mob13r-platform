// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/* ===========================================================
   SMALL HELPERS
=========================================================== */
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

/* Rule vs Geo/Carrier smart scoring */
function scoreRule(rule, reqGeo, reqCarrier) {
  const g = norm(reqGeo);
  const c = norm(reqCarrier);

  const ruleGeos = splitList(rule.geo);
  const ruleCarriers = splitList(rule.carrier);

  const anyGeo = isAnyToken(ruleGeos);
  const anyCarrier = isAnyToken(ruleCarriers);

  const geoMatch = anyGeo || ruleGeos.includes(g);
  const carrierMatch = anyCarrier || ruleCarriers.includes(c);

  if (!geoMatch && !carrierMatch) return null;

  let score = 0;
  if (!anyGeo && !anyCarrier && geoMatch && carrierMatch) score = 3;
  else if (!anyGeo && geoMatch && anyCarrier) score = 2;
  else if (!anyCarrier && carrierMatch && anyGeo) score = 1;
  else score = 0;

  const weight = Number(rule.weight) || 0;

  return { score, weight };
}

/* ===========================================================
   META (tracking links)
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
    return res.json(rows);
  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   OFFERS
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
    return res.json(rows);
  } catch (err) {
    console.error("OFFERS ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
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
    return res.json(rows);
  } catch (err) {
    console.error("RULES ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   DELETE RULE
=========================================================== */
router.delete("/rules/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "invalid_id" });

    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [id]);

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   OVERVIEW
=========================================================== */
router.get("/overview", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM traffic_rules
      ORDER BY pub_id ASC, id ASC
    `);

    return res.json(rows);
  } catch (err) {
    console.error("OVERVIEW ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   REMAINING RULES  (NEW API)
=========================================================== */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const q = `
      SELECT
        id,
        pub_id,
        offer_id,
        geo,
        carrier,
        weight,
        daily_cap,
        COALESCE(sent_today, 0) AS sent_today,
        (daily_cap - COALESCE(sent_today, 0)) AS remaining
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);
    return res.json(rows);
  } catch (err) {
    console.error("REMAINING RULES ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   CLICK ROTATION + LOGGING
=========================================================== */
router.get("/click", fraudCheck, async (req, res) => {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.status(400).send("missing params");
    }

    const normPub = pub_id.toUpperCase();

    const rulesSQL = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
        AND status = 'active'
    `;

    const { rows: rules } = await pool.query(rulesSQL, [normPub]);
    if (!rules.length) return res.redirect("https://google.com");

    /* smart match */
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

    if (!bestRule) {
      bestRule =
        rules.reduce(
          (max, r) =>
            Number(r.weight || 0) > Number(max.weight || 0) ? r : max,
          rules[0]
        ) || rules[0];
    }

    const selected = bestRule;

    /* log click */
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
          JSON.stringify(req.query || {}),
        ]
      );
    } catch (e) {
      console.error("CLICK LOGGING ERROR:", e);
    }

    /* final redirect */
    let finalUrl = selected.redirect_url;
    if (!finalUrl) return res.redirect("https://google.com");

    if (click_id) {
      finalUrl +=
        (finalUrl.includes("?") ? "&" : "?") + `click_id=${click_id}`;
    }

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://google.com");
  }
});

export default router;
