import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   UTILITY JSON RESPONSE (same format as INAPP)
   ====================================================== */
function success(message, extra = {}) {
  return {
    response: "SUCCESS",
    errorMessage: message,
    ...extra,
  };
}

function fail(message, extra = {}) {
  return {
    response: "Fail",
    errorMessage: message,
    ...extra,
  };
}

/* ======================================================
   TARGETING MATCH
   ====================================================== */
function matchesTargeting(rule, geo, carrier, device) {
  const geoOK = !geo || rule.geo === "ALL" || rule.geo === geo;
  const carrierOK = !carrier || rule.carrier === "ALL" || rule.carrier === carrier;
  const deviceOK = !device || rule.device === "ALL" || rule.device === device;
  return geoOK && carrierOK && deviceOK;
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
    acc += r.weight;
    if (rnd <= acc) return r;
  }

  return rules[0];
}

/* ======================================================
   CAPS CHECK (future)
   ====================================================== */
async function checkCaps(ruleRow) {
  // TODO: integrate click_logs + conversion caps here
  return true;
}

/* ======================================================
   OFFER RESPONSE BUILDER (CPA, CPS, SMARTLINK, INAPP)
   ====================================================== */
function buildOfferResponse(rule, context) {
  const {
    offer_type,
    offer_tracking_url,
    offer_id,
    offer_is_fallback,
    inapp_template_id,
    inapp_config,
  } = rule;

  const base = { offer_id, type: offer_type };

  switch (offer_type) {
    case "INAPP":
      return success("INAPP Loaded", {
        ...base,
        template_id: inapp_template_id,
        inapp_config,
      });

    case "SMARTLINK":
      return success("Smartlink Offer Selected", {
        ...base,
        url: offer_tracking_url,
      });

    case "ROTATION":
      return success("Rotation Offer Selected", {
        ...base,
        url: offer_tracking_url,
      });

    case "FALLBACK":
      return success("Fallback Offer Selected", {
        ...base,
        url: offer_tracking_url,
      });

    default:
      return success(
        offer_is_fallback ? "Fallback Offer Selected" : "Offer Selected",
        {
          ...base,
          url: offer_tracking_url,
        }
      );
  }
}

/* ======================================================
   🟢 RESOLVE CLICK (PUBLIC API)
   Example:
   /api/distribution/resolve?pub_id=PUB03&tracking_link_id=3&geo=BD&carrier=ROBI
   ====================================================== */
router.get("/resolve", async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier, device, ip, ua } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res.status(400).json(fail("Missing pub_id or tracking_link_id"));
    }

    // 1. Load active rules
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
      return res.status(200).json(fail("No active rules for this publisher"));
    }

    // 2. Apply targeting filters
    const matched = rows.filter((r) =>
      matchesTargeting(r, geo, carrier, device)
    );

    // 3. If no match → fallback
    if (!matched.length) {
      const fallback = rows.find(
        (r) => r.is_fallback || r.offer_type === "FALLBACK"
      );

      if (fallback) {
        return res.status(200).json(
          buildOfferResponse(fallback, { pub_id, tracking_link_id, geo })
        );
      }

      return res.status(200).json(fail("No matching rule"));
    }

    // 4. Use lowest priority group
    const minPriority = matched[0].priority;
    const samePriority = matched.filter((r) => r.priority === minPriority);

    // 5. Caps check
    const eligible = [];
    for (const r of samePriority) {
      const capsOK = await checkCaps(r);
      if (capsOK) eligible.push(r);
    }

    if (!eligible.length) {
      const fallback = rows.find(
        (r) => r.is_fallback || r.offer_type === "FALLBACK"
      );
      if (fallback) {
        return res.status(200).json(buildOfferResponse(fallback));
      }
      return res.status(200).json(fail("All rules over cap"));
    }

    // 6. Weighted random pick
    const selected = pickByWeight(eligible);

    // 7. Final offer response
    return res.status(200).json(
      buildOfferResponse(selected, { pub_id, geo, carrier, device })
    );
  } catch (error) {
    console.error("RESOLVE ERROR:", error);
    return res.status(500).json(fail("Internal error"));
  }
});

/* ======================================================
   🟡 ADMIN – GET RULES BY LINK
   ====================================================== */
router.get("/rules/:pub_id/:tracking_id", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_id } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2
       ORDER BY priority ASC, id ASC`,
      [pub_id, tracking_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET RULES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟠 ADMIN – CREATE RULE
   ====================================================== */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const {
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

    const { rows } = await pool.query(
      `
      INSERT INTO distribution_rules
      (pub_id, tracking_link_id, offer_id, priority, weight, geo, carrier, device, is_active, is_fallback, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,'active',NOW(),NOW())
      RETURNING *;
      `,
      [
        pub_id,
        tracking_link_id,
        offer_id,
        priority || 1,
        weight || 100,
        geo || "ALL",
        carrier || "ALL",
        device || "ALL",
        is_fallback || false,
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("POST RULE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟥 ADMIN – DELETE RULE
   ====================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM distribution_rules WHERE id=$1", [id]);

    res.json({ message: "Rule deleted" });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
