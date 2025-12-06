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
   TARGET MATCHING
------------------------------------------------------------------ */
function matchesTarget(rule, geo, carrier, device) {
  const geoOK = !geo || rule.geo === "ALL" || rule.geo === geo;
  const carrierOK = !carrier || rule.carrier === "ALL" || rule.carrier === carrier;
  const deviceOK = !device || rule.device === "ALL" || rule.device === device;
  return geoOK && carrierOK && deviceOK;
}

/* ------------------------------------------------------------------
   PICK RULE USING WEIGHT
------------------------------------------------------------------ */
function pickByWeight(rules) {
  if (!rules.length) return null;

  const total = rules.reduce((sum, r) => sum + (r.weight || 0), 0);
  if (total <= 0) return rules[0];

  const rand = Math.random() * total;
  let acc = 0;
  for (const r of rules) {
    acc += r.weight || 0;
    if (rand <= acc) return r;
  }
  return rules[0];
}

/* ------------------------------------------------------------------
   CAPS CHECK (placeholder: always true for now)
------------------------------------------------------------------ */
async function checkCaps(rule) {
  // Future logic: compare tracking/conversions with daily & total caps
  return true;
}

/* ------------------------------------------------------------------
   BUILD RESPONSE WITH TRACKING URL
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
   PUBLIC RESOLVE ENDPOINT  (Used by front-end and click router)
   /api/distribution/resolve?pub_id=PUB03&tracking_link_id=3
=================================================================== */
router.get("/resolve", async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier, device } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res.status(400).json(fail("Missing pub_id or tracking_link_id"));
    }

    /* 🔥 RULE QUERY (JOIN WITH OFFERS TABLE) */
    const rulesQuery = `
      SELECT 
        dr.*, 
        o.type AS offer_type,
        o.tracking_url AS offer_tracking_url,
        o.is_fallback
      FROM distribution_rules dr
      JOIN offers o ON o.offer_id = dr.offer_id
      WHERE dr.pub_id = $1
        AND dr.tracking_link_id = $2
        AND dr.is_active = TRUE
        AND dr.status = 'active'
      ORDER BY dr.priority ASC, dr.id ASC
    `;

    const rules = (await pool.query(rulesQuery, [pub_id, tracking_link_id])).rows;

    if (!rules.length) {
      return res.status(200).json(fail("No active rules"));
    }

    /* 🔍 TARGET MATCH */
    const matched = rules.filter((r) => matchesTarget(r, geo, carrier, device));

    if (!matched.length) {
      const fallback = rules.find((r) => r.is_fallback);
      return fallback
        ? res.json(buildOfferResponse(fallback))
        : res.json(fail("No targeting match"));
    }

    /* PRIORITY GROUP */
    const minPriority = matched[0].priority;
    const samePriority = matched.filter((r) => r.priority === minPriority);

    /* CAP CHECK */
    const eligible = [];
    for (const r of samePriority) {
      if (await checkCaps(r)) eligible.push(r);
    }

    if (!eligible.length) {
      const fallback = rules.find((r) => r.is_fallback);
      return fallback
        ? res.json(buildOfferResponse(fallback))
        : res.json(fail("All rules capped"));
    }

    /* WEIGHT PICK */
    const selected = pickByWeight(eligible);
    return res.json(buildOfferResponse(selected));
  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    res.status(500).json(fail("Internal Error"));
  }
});

/* ==================================================================
   ADMIN PANEL: GET RULES FOR A PUB + TRACKING LINK
   Example: GET /api/distribution/rules/PUB03/3
=================================================================== */
router.get("/rules/:pub_id/:tracking_link_id", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.params;

    const q = `
      SELECT *
      FROM distribution_rules
      WHERE pub_id = $1 AND tracking_link_id = $2
      ORDER BY priority ASC, id ASC
    `;

    const rows = (await pool.query(q, [pub_id, tracking_link_id])).rows;
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
      pub_id,
      tracking_link_id,
      offer_id,
      priority,
      weight,
      geo,
      carrier,
      device,
      is_fallback,
    } = req.body;

    if (!pub_id || !tracking_link_id || !offer_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    priority = priority ?? 1;
    weight = weight ?? 100;
    geo = geo || "ALL";
    carrier = carrier || "ALL";
    device = device || "ALL";
    is_fallback = !!is_fallback;

    /* DUPLICATE CHECK */
    const dup = await pool.query(
      `
      SELECT 1 FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3
        AND geo=$4 AND carrier=$5
    `,
      [pub_id, tracking_link_id, offer_id, geo, carrier]
    );

    if (dup.rowCount > 0) {
      return res.status(400).json({ error: "Duplicate rule" });
    }

    /* INSERT RULE */
    const insert = `
      INSERT INTO distribution_rules
      (pub_id, tracking_link_id, offer_id, priority, weight, geo, carrier,
       device, is_active, is_fallback, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,'active',NOW(),NOW())
      RETURNING *
    `;

    const values = [
      pub_id,
      tracking_link_id,
      offer_id,
      priority,
      weight,
      geo,
      carrier,
      device,
      is_fallback,
    ];

    const row = (await pool.query(insert, values)).rows[0];
    res.json(row);
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

    const current = await pool.query(
      "SELECT * FROM distribution_rules WHERE id=$1",
      [id]
    );

    if (!current.rowCount) {
      return res.status(404).json({ error: "Rule not found" });
    }

    const cur = current.rows[0];

    let {
      pub_id = cur.pub_id,
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

    /* DUPLICATE CHECK */
    const dup = await pool.query(
      `
      SELECT 1 FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3
        AND geo=$4 AND carrier=$5 AND id<>$6
    `,
      [pub_id, tracking_link_id, offer_id, geo, carrier, id]
    );

    if (dup.rowCount > 0) {
      return res.status(400).json({ error: "Duplicate rule" });
    }

    /* UPDATE RULE */
    const update = `
      UPDATE distribution_rules
      SET pub_id=$1, tracking_link_id=$2, offer_id=$3,
          priority=$4, weight=$5, geo=$6, carrier=$7, device=$8,
          is_active=$9, is_fallback=$10, status=$11, updated_at=NOW()
      WHERE id=$12
      RETURNING *
    `;

    const updated = (
      await pool.query(update, [
        pub_id,
        tracking_link_id,
        offer_id,
        priority,
        weight,
        geo,
        carrier,
        device,
        is_active,
        is_fallback,
        status,
        id,
      ])
    ).rows[0];

    res.json(updated);
  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ==================================================================
   DELETE RULE
=================================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM distribution_rules WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ message: "Rule deleted" });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
