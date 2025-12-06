import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ------------------------------------------------------------------
   COMMON RESPONSE HELPERS
------------------------------------------------------------------ */
const success = (msg, extra = {}) => ({
  response: "SUCCESS",
  errorMessage: msg,
  ...extra,
});

const fail = (msg, extra = {}) => ({
  response: "FAIL",
  errorMessage: msg,
  ...extra,
});

/* ------------------------------------------------------------------
   TARGET MATCH
------------------------------------------------------------------ */
function matchesTarget(rule, geo, carrier, device) {
  const geoOK = !geo || rule.geo === "ALL" || rule.geo === geo;
  const carrierOK = !carrier || rule.carrier === "ALL" || rule.carrier === carrier;
  const deviceOK = !device || rule.device === "ALL" || rule.device === device;
  return geoOK && carrierOK && deviceOK;
}

/* ------------------------------------------------------------------
   WEIGHT PICK
------------------------------------------------------------------ */
function pickByWeight(rules) {
  if (!rules.length) return null;

  const total = rules.reduce((s, r) => s + (r.weight || 0), 0);
  if (total <= 0) return rules[0];

  const rnd = Math.random() * total;
  let acc = 0;
  for (const r of rules) {
    acc += r.weight || 0;
    if (rnd <= acc) return r;
  }
  return rules[0];
}

/* ------------------------------------------------------------------
   CAPS (placeholder)
------------------------------------------------------------------ */
async function checkCaps() {
  return true;
}

/* ------------------------------------------------------------------
   BUILD OFFER RESPONSE
------------------------------------------------------------------ */
function buildOfferResponse(rule) {
  return success(
    rule.is_fallback ? "Fallback Offer Selected" : "Offer Selected",
    {
      offer_id: rule.offer_id,
      type: rule.offer_type,
      url: rule.offer_tracking_url,
    }
  );
}

/* ==================================================================
   PUBLIC RESOLVE
=================================================================== */
router.get("/resolve", async (req, res) => {
  try {
    const { pub_code, tracking_link_id, geo, carrier, device } = req.query;

    if (!pub_code || !tracking_link_id) {
      return res.status(400).json(fail("Missing pub_code or tracking_link_id"));
    }

    const { rows } = await pool.query(
      `
      SELECT dr.*, 
             o.type AS offer_type,
             o.tracking_url AS offer_tracking_url,
             o.is_fallback
      FROM distribution_rules dr
      JOIN offers o ON o.offer_id = dr.offer_id
      WHERE dr.pub_code = $1
        AND dr.tracking_link_id = $2
        AND dr.is_active = TRUE
        AND dr.status = 'active'
      ORDER BY dr.priority ASC, dr.id ASC
      `,
      [pub_code, tracking_link_id]
    );

    if (!rows.length) {
      return res.status(200).json(fail("No active rules"));
    }

    const matched = rows.filter((r) =>
      matchesTarget(r, geo, carrier, device)
    );

    if (!matched.length) {
      const fallback = rows.find((r) => r.is_fallback);
      return fallback
        ? res.json(buildOfferResponse(fallback))
        : res.json(fail("No targeting match"));
    }

    const minPriority = matched[0].priority;
    const prRules = matched.filter((r) => r.priority === minPriority);

    const eligible = [];
    for (const r of prRules) {
      if (await checkCaps(r)) eligible.push(r);
    }

    if (!eligible.length) {
      const fallback = rows.find((r) => r.is_fallback);
      return fallback
        ? res.json(buildOfferResponse(fallback))
        : res.json(fail("All rules capped"));
    }

    const selected = pickByWeight(eligible);
    return res.json(buildOfferResponse(selected));
  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    res.status(500).json(fail("Internal Error"));
  }
});

/* ==================================================================
   ADMIN: GET RULES BY pub_code + tracking_link_id
=================================================================== */
router.get("/rules/:pub_code/:tracking_link_id", authJWT, async (req, res) => {
  try {
    const { pub_code, tracking_link_id } = req.params;

    const { rows } = await pool.query(
      `
      SELECT *
      FROM distribution_rules
      WHERE pub_code = $1 AND tracking_link_id = $2
      ORDER BY priority ASC, id ASC
      `,
      [pub_code, tracking_link_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET RULES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ==================================================================
   CREATE RULE
=================================================================== */
router.post("/rules", authJWT, async (req, res) => {
  try {
    let {
      pub_code,
      tracking_link_id,
      offer_id,
      priority,
      weight,
      geo,
      carrier,
      device,
      is_fallback,
    } = req.body;

    if (!pub_code || !tracking_link_id || !offer_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    priority = priority ?? 1;
    weight = weight ?? 100;
    geo = geo || "ALL";
    carrier = carrier || "ALL";
    device = device || "ALL";
    is_fallback = !!is_fallback;

    const dup = await pool.query(
      `
      SELECT 1 FROM distribution_rules
      WHERE pub_code=$1 AND tracking_link_id=$2 AND offer_id=$3 
        AND geo=$4 AND carrier=$5
      `,
      [pub_code, tracking_link_id, offer_id, geo, carrier]
    );

    if (dup.rowCount > 0) {
      return res.status(400).json({ error: "Duplicate rule" });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO distribution_rules
      (pub_code, tracking_link_id, offer_id, priority, weight, geo, carrier,
       device, is_active, is_fallback, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,'active',NOW(),NOW())
      RETURNING *;
      `,
      [
        pub_code,
        tracking_link_id,
        offer_id,
        priority,
        weight,
        geo,
        carrier,
        device,
        is_fallback,
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("ADD RULE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ==================================================================
   UPDATE RULE
=================================================================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(
      "SELECT * FROM distribution_rules WHERE id=$1",
      [id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({ error: "Rule not found" });
    }

    const cur = existing.rows[0];

    let {
      pub_code = cur.pub_code,
      tracking_link_id = cur.tracking_link_id,
      offer_id = cur.offer_id,
      priority = cur.priority,
      weight = cur.weight,
      geo = cur.geo,
      carrier = cur.carrier,
      device = cur.device,
      is_active = cur.is_active,
      is_fallback = cur.is_fallback,
      status = cur.status,
    } = req.body;

    const dup = await pool.query(
      `
      SELECT 1 FROM distribution_rules
      WHERE pub_code=$1 AND tracking_link_id=$2 AND offer_id=$3
        AND geo=$4 AND carrier=$5 AND id <> $6
      `,
      [pub_code, tracking_link_id, offer_id, geo, carrier, id]
    );

    if (dup.rowCount > 0) {
      return res.status(400).json({ error: "Duplicate rule" });
    }

    const updated = (
      await pool.query(
        `
      UPDATE distribution_rul_
