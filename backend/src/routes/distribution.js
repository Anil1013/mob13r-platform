// src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   GENERIC HELPERS
   ====================================================== */
const success = (message, extra = {}) => ({
  response: "SUCCESS",
  errorMessage: message,
  ...extra,
});

const fail = (message, extra = {}) => ({
  response: "Fail",
  errorMessage: message,
  ...extra,
});

/* ======================================================
   TARGETING MATCH
   ====================================================== */
function matchesTargeting(rule, geo, carrier, device) {
  const geoOk = !geo || rule.geo === "ALL" || rule.geo === geo;
  const carrierOk = !carrier || rule.carrier === "ALL" || rule.carrier === carrier;
  const deviceOk = !device || rule.device === "ALL" || rule.device === device;
  return geoOk && carrierOk && deviceOk;
}

/* ======================================================
   WEIGHT PICKER
   ====================================================== */
function pickByWeight(rules) {
  if (!rules.length) return null;
  if (rules.length === 1) return rules[0];

  const total = rules.reduce((sum, r) => sum + (r.weight || 0), 0);
  if (total <= 0) return rules[0];

  const rnd = Math.random() * total;
  let acc = 0;

  for (const r of rules) {
    acc += r.weight || 0;
    if (rnd <= acc) return r;
  }
  return rules[0];
}

/* ======================================================
   CAPS CHECK (Future-ready)
   ====================================================== */
async function checkCaps(_ruleRow) {
  // TODO: caps based on clicks/conversions
  return true;
}

/* ======================================================
   BUILD OFFER RESPONSE
   ====================================================== */
function buildOfferResponse(rule) {
  const base = {
    offer_id: rule.offer_id,
    type: rule.offer_type,
  };

  switch (rule.offer_type) {
    case "INAPP":
      return success("INAPP Loaded", {
        ...base,
        template_id: rule.inapp_template_id,
        inapp_config: rule.inapp_config,
      });

    case "SMARTLINK":
    case "ROTATION":
      return success("Offer Selected", {
        ...base,
        url: rule.offer_tracking_url,
      });

    case "FALLBACK":
      return success("Fallback Offer Selected", {
        ...base,
        url: rule.offer_tracking_url,
      });

    default:
      return success(
        rule.offer_is_fallback ? "Fallback Offer Selected" : "Offer Selected",
        {
          ...base,
          url: rule.offer_tracking_url,
        }
      );
  }
}

/* ======================================================
   PUBLIC API: RESOLVE
   ====================================================== */
router.get("/resolve", async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier, device } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res.status(400).json(fail("Missing pub_id or tracking_link_id"));
    }

    const { rows } = await pool.query(
      `
      SELECT 
        dr.*,
        o.type AS offer_type,
        o.tracking_url AS offer_tracking_url,
        o.inapp_template_id,
        o.inapp_config,
        o.is_fallback AS offer_is_fallback
      FROM distribution_rules dr
      JOIN offers o ON o.offer_id = dr.offer_id
      WHERE dr.pub_id = $1
        AND dr.tracking_link_id = $2
        AND dr.is_active = TRUE
        AND dr.status = 'active'
      ORDER BY dr.priority ASC, dr.id ASC
    `,
      [pub_id, tracking_link_id]
    );

    if (!rows.length) {
      return res.status(200).json(fail("No active rules for this publisher/link"));
    }

    /* 🔍 Targeting match */
    const matched = rows.filter((r) => matchesTargeting(r, geo, carrier, device));

    /* ❌ No targeting match → fallback */
    if (!matched.length) {
      const fallbackRule =
        rows.find((r) => r.is_fallback === true) ||
        rows.find((r) => r.offer_type === "FALLBACK");

      if (fallbackRule) {
        return res.status(200).json(buildOfferResponse(fallbackRule));
      }

      return res.status(200).json(fail("No matching rule / targeting"));
    }

    /* 🎯 Lowest priority group */
    const minPriority = matched[0].priority;
    const samePriority = matched.filter((r) => r.priority === minPriority);

    /* 🟡 Caps filter */
    const eligible = [];
    for (const r of samePriority) {
      const ok = await checkCaps(r);
      if (ok) eligible.push(r);
    }

    if (!eligible.length) {
      const fallbackRule =
        rows.find((r) => r.is_fallback === true) ||
        rows.find((r) => r.offer_type === "FALLBACK");

      if (fallbackRule) {
        return res.status(200).json(buildOfferResponse(fallbackRule));
      }

      return res.status(200).json(fail("All rules over cap"));
    }

    /* 🔥 Weighted selection */
    const selectedRule = pickByWeight(eligible);

    /* 📝 TODO: Log click */

    return res.status(200).json(buildOfferResponse(selectedRule));
  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    res.status(500).json(fail("Internal error in distribution"));
  }
});

/* ======================================================
   ADMIN: GET RULES FOR A LINK
   ====================================================== */
router.get("/rules/:pub_id/:tracking_link_id", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.params;

    const { rows } = await pool.query(
      `
      SELECT *
      FROM distribution_rules
      WHERE pub_id = $1 AND tracking_link_id = $2
      ORDER BY priority ASC, id ASC
    `,
      [pub_id, tracking_link_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET RULES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   ADMIN: CREATE RULE
   ====================================================== */
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
      return res.status(400).json({
        error: "pub_id, tracking_link_id and offer_id are required",
      });
    }

    /* Defaults */
    priority = priority ?? 1;
    weight = weight ?? 100;
    geo = geo || "ALL";
    carrier = carrier || "ALL";
    device = device || "ALL";
    is_fallback = !!is_fallback;

    /* 🔍 Duplicate check */
    const dup = await pool.query(
      `
      SELECT 1 FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3 
        AND geo=$4 AND carrier=$5
    `,
      [pub_id, tracking_link_id, offer_id, geo, carrier]
    );

    if (dup.rowCount > 0) {
      return res.status(400).json({
        error: "Rule already exists with same pub, link, offer, geo, carrier",
      });
    }

    /* INSERT */
    const { rows } = await pool.query(
      `
      INSERT INTO distribution_rules
      (pub_id, tracking_link_id, offer_id, priority, weight, geo, carrier, device,
       is_active, is_fallback, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,'active',NOW(),NOW())
      RETURNING *;
    `,
      [
        pub_id,
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

    if (err.code === "23505" && err.constraint === "unique_rule_per_geo") {
      return res.status(400).json({
        error: "Rule already exists with same pub, link, offer, geo, carrier",
      });
    }

    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   ADMIN: UPDATE RULE
   ====================================================== */
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

    /* Duplicate check */
    const dup = await pool.query(
      `
      SELECT 1 FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3
        AND geo=$4 AND carrier=$5 AND id <> $6
    `,
      [pub_id, tracking_link_id, offer_id, geo, carrier, id]
    );

    if (dup.rowCount > 0) {
      return res.status(400).json({
        error: "Another rule already exists with same pub, link, offer, geo, carrier",
      });
    }

    const { rows } = await pool.query(
      `
      UPDATE distribution_rules
      SET pub_id=$1, tracking_link_id=$2, offer_id=$3,
          priority=$4, weight=$5, geo=$6, carrier=$7, device=$8,
          is_active=$9, is_fallback=$10, status=$11, updated_at=NOW()
      WHERE id=$12
      RETURNING *;
    `,
      [
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
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);

    if (err.code === "23505") {
      return res.status(400).json({
        error: "Rule already exists with same pub, link, offer, geo, carrier",
      });
    }

    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   ADMIN: DELETE RULE (SOFT DELETE RECOMMENDED)
   ====================================================== */
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
