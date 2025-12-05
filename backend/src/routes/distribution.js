// src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   COMMON HELPERS (SUCCESS / FAIL for resolve API)
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
   TARGETING MATCH: GEO / CARRIER / DEVICE
   ====================================================== */
function matchesTargeting(rule, geo, carrier, device) {
  const geoOk = !geo || rule.geo === "ALL" || rule.geo === geo;
  const carrierOk =
    !carrier || rule.carrier === "ALL" || rule.carrier === carrier;
  const deviceOk =
    !device || rule.device === "ALL" || rule.device === device;
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
   CAPS CHECK (placeholder – always true for now)
   ====================================================== */
async function checkCaps(_ruleRow) {
  // TODO: implement caps based on clicks / conversions
  return true;
}

/* ======================================================
   OFFER RESPONSE BUILDER (CPA, CPI, CPS, CPL, INAPP, etc.)
   ====================================================== */
function buildOfferResponse(rule) {
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
   🟢 PUBLIC: RESOLVE DISTRIBUTION
   GET /api/distribution/resolve?pub_id=PUB03&tracking_link_id=3&geo=BD&carrier=ROBI&device=ANDROID
   ====================================================== */
router.get("/resolve", async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier, device } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res
        .status(400)
        .json(fail("Missing pub_id or tracking_link_id"));
    }

    // 1) Load active rules + offer info
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
      return res
        .status(200)
        .json(fail("No active rules for this publisher/link"));
    }

    // 2) Apply targeting
    const matched = rows.filter((r) =>
      matchesTargeting(r, geo, carrier, device)
    );

    // 3) If targeting fail → fallback
    if (!matched.length) {
      const fallbackRule = rows.find(
        (r) => r.is_fallback === true || r.offer_type === "FALLBACK"
      );
      if (fallbackRule) {
        return res.status(200).json(buildOfferResponse(fallbackRule));
      }
      return res.status(200).json(fail("No matching rule / targeting"));
    }

    // 4) Lowest priority group
    const minPriority = matched[0].priority;
    const samePriority = matched.filter(
      (r) => r.priority === minPriority
    );

    // 5) Caps check
    const eligible = [];
    for (const r of samePriority) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await checkCaps(r);
      if (ok) eligible.push(r);
    }

    if (!eligible.length) {
      const fallbackRule = rows.find(
        (r) => r.is_fallback === true || r.offer_type === "FALLBACK"
      );
      if (fallbackRule) {
        return res.status(200).json(buildOfferResponse(fallbackRule));
      }
      return res.status(200).json(fail("All rules over cap"));
    }

    // 6) Weighted random
    const selectedRule = pickByWeight(eligible);

    // 7) TODO: click logging here (traffic_logs etc.)

    // 8) Final response
    return res.status(200).json(buildOfferResponse(selectedRule));
  } catch (err) {
    console.error("RESOLVE ERROR:", err);
    return res.status(500).json(fail("Internal error in distribution"));
  }
});

/* ======================================================
   🟡 ADMIN: GET RULES FOR ONE LINK
   GET /api/distribution/rules/:pub_id/:tracking_link_id
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
   🟠 ADMIN: CREATE RULE (with DUPLICATE CHECK)
   POST /api/distribution/rules
   Body: { pub_id, tracking_link_id, offer_id, priority, weight, geo, carrier, device, is_fallback }
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

    // defaults same as DB
    priority = priority ?? 1;
    weight = weight ?? 100;
    geo = geo || "ALL";
    carrier = carrier || "ALL";
    device = device || "ALL";
    is_fallback = !!is_fallback;

    // 🔍 DUPLICATE CHECK (same as DB unique_rule_per_geo)
    const dupCheck = await pool.query(
      `
      SELECT 1
      FROM distribution_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
        AND offer_id = $3
        AND geo = $4
        AND carrier = $5
      `,
      [pub_id, tracking_link_id, offer_id, geo, carrier]
    );

    if (dupCheck.rowCount > 0) {
      return res.status(400).json({
        error: "Rule already exists with same pub, link, offer, geo, carrier",
      });
    }

    // INSERT
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

    // Agar kisi reason se DB unique constraint hit ho jaye to friendly message
    if (err.code === "23505" && err.constraint === "unique_rule_per_geo") {
      return res.status(400).json({
        error: "Rule already exists with same pub, link, offer, geo, carrier",
      });
    }

    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟡 ADMIN: UPDATE RULE
   PUT /api/distribution/rules/:id
   ====================================================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
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
      is_active,
      status,
    } = req.body;

    // first fetch existing row (for defaults)
    const existing = await pool.query(
      "SELECT * FROM distribution_rules WHERE id=$1",
      [id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({ error: "Rule not found" });
    }

    const current = existing.rows[0];

    pub_id = pub_id || current.pub_id;
    tracking_link_id = tracking_link_id || current.tracking_link_id;
    offer_id = offer_id || current.offer_id;
    priority = priority ?? current.priority ?? 1;
    weight = weight ?? current.weight ?? 100;
    geo = geo || current.geo || "ALL";
    carrier = carrier || current.carrier || "ALL";
    device = device || current.device || "ALL";
    is_fallback =
      typeof is_fallback === "boolean" ? is_fallback : current.is_fallback;
    is_active =
      typeof is_active === "boolean" ? is_active : current.is_active;
    status = status || current.status || "active";

    // Duplicate check (excluding same id)
    const dupCheck = await pool.query(
      `
      SELECT 1
      FROM distribution_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
        AND offer_id = $3
        AND geo = $4
        AND carrier = $5
        AND id <> $6
      `,
      [pub_id, tracking_link_id, offer_id, geo, carrier, id]
    );

    if (dupCheck.rowCount > 0) {
      return res.status(400).json({
        error: "Another rule already exists with same pub, link, offer, geo, carrier",
      });
    }

    const { rows } = await pool.query(
      `
      UPDATE distribution_rules
      SET pub_id=$1,
          tracking_link_id=$2,
          offer_id=$3,
          priority=$4,
          weight=$5,
          geo=$6,
          carrier=$7,
          device=$8,
          is_active=$9,
          is_fallback=$10,
          status=$11,
          updated_at=NOW()
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

    if (err.code === "23505" && err.constraint === "unique_rule_per_geo") {
      return res.status(400).json({
        error: "Rule already exists with same pub, link, offer, geo, carrier",
      });
    }

    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟥 ADMIN: DELETE RULE
   DELETE /api/distribution/rules/:id
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
