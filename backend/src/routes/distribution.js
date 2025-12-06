import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

const apiSuccess = (data = {}) => ({ success: true, ...data });
const apiError = (message, extra = {}) => ({
  success: false,
  message,
  ...extra,
});

const ALLOWED_PARAMS = [
  "ip",
  "ua",
  "device",
  "msisdn",
  "click_id",
  "sub1",
  "sub2",
  "sub3",
  "sub4",
  "sub5",
];

function normaliseRequiredParamsArray(list) {
  if (!Array.isArray(list)) return [];
  const set = new Set();
  for (const raw of list) {
    const key = String(raw || "").toLowerCase();
    if (ALLOWED_PARAMS.includes(key)) {
      set.add(key);
    }
  }
  return Array.from(set);
}

function buildParamsJson(flags = {}) {
  const obj = {};
  for (const key of ALLOWED_PARAMS) {
    obj[key] = !!flags[key];
  }
  return obj;
}

/**
 * DB-level validation for rules
 *  - Only 1 fallback per (pub_code, tracking_link_id)
 *  - No exact duplicates (pub_code + tracking_link_id + offer_id + geo + carrier + device)
 */
async function validateRuleOnServer({
  idToIgnore = null,
  pub_code,
  tracking_link_id,
  offer_id,
  geo,
  carrier,
  device,
  is_fallback,
}) {
  // 1) Fallback uniqueness
  if (is_fallback) {
    const sql = `
      SELECT id
      FROM distribution_rules
      WHERE pub_code = $1
        AND tracking_link_id = $2
        AND is_fallback = TRUE
        AND is_active = TRUE
        ${idToIgnore ? "AND id <> $3" : ""}
    `;
    const params = idToIgnore
      ? [pub_code, tracking_link_id, idToIgnore]
      : [pub_code, tracking_link_id];

    const fallbackCheck = await pool.query(sql, params);

    if (fallbackCheck.rowCount > 0) {
      return "A fallback rule already exists for this tracking link.";
    }
  }

  // 2) Duplicate targeting rule
  const dupSql = `
    SELECT id
    FROM distribution_rules
    WHERE pub_code = $1
      AND tracking_link_id = $2
      AND offer_id = $3
      AND geo = $4
      AND carrier = $5
      AND device = $6
      AND is_active = TRUE
      ${idToIgnore ? "AND id <> $7" : ""}
  `;
  const dupParams = idToIgnore
    ? [pub_code, tracking_link_id, offer_id, geo, carrier, device, idToIgnore]
    : [pub_code, tracking_link_id, offer_id, geo, carrier, device];

  const dupCheck = await pool.query(dupSql, dupParams);

  if (dupCheck.rowCount > 0) {
    return "Duplicate rule: same Offer + Geo + Carrier + Device already exists.";
  }

  return null; // no error
}

/* ------------------------------------------------------------------
   TRACKING LINKS (by pub_code)
   Example:
   GET /api/distribution/tracking-links?pub_code=PUB03
------------------------------------------------------------------ */

router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_code } = req.query;
    if (!pub_code) {
      return res.status(400).json(apiError("pub_code required"));
    }

    const q = `
      SELECT
        id,
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
        hold_percent,
        landing_page_url,
        tracking_url,
        pin_send_url,
        pin_verify_url,
        check_status_url,
        portal_url,
        status,
        created_at,
        updated_at,
        required_params
      FROM publisher_tracking_links
      WHERE pub_code = $1
        AND status = 'active'
      ORDER BY id ASC
    `;

    const result = await pool.query(q, [pub_code]);
    res.json(apiSuccess({ items: result.rows }));
  } catch (err) {
    console.error("tracking-links error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

/* ------------------------------------------------------------------
   UPDATE DEFAULT PARAMETERS ON TRACKING LINK
   PUT /api/distribution/tracking-links/:id/params
------------------------------------------------------------------ */

router.put("/tracking-links/:id/params", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { required_params } = req.body || {};

    const paramsJson = buildParamsJson(required_params || {});

    const updateSql = `
      UPDATE publisher_tracking_links
      SET required_params = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(updateSql, [paramsJson, id]);
    if (!result.rowCount) {
      return res.status(404).json(apiError("Tracking link not found"));
    }

    res.json(apiSuccess({ item: result.rows[0] }));
  } catch (err) {
    console.error("update tracking-link params error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

/* ------------------------------------------------------------------
   OFFERS (for dropdown)
   Example:
   GET /api/distribution/offers?search=game
------------------------------------------------------------------ */

router.get("/offers", authJWT, async (req, res) => {
  try {
    const { search = "" } = req.query;

    const q = `
      SELECT
        offer_id,
        name,
        type,
        advertiser_name,
        status
      FROM offers
      WHERE status = 'active'
        AND (
          $1 = '' OR
          LOWER(offer_id) LIKE LOWER('%' || $1 || '%') OR
          LOWER(name) LIKE LOWER('%' || $1 || '%')
        )
      ORDER BY offer_id ASC
      LIMIT 200
    `;

    const result = await pool.query(q, [search.trim()]);
    res.json(apiSuccess({ items: result.rows }));
  } catch (err) {
    console.error("offers list error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

/* ------------------------------------------------------------------
   LIST RULES for a tracking link
   Example:
   GET /api/distribution/rules?tracking_link_id=3
------------------------------------------------------------------ */

router.get("/rules", authJWT, async (req, res) => {
  try {
    const { tracking_link_id } = req.query;
    if (!tracking_link_id) {
      return res.status(400).json(apiError("tracking_link_id required"));
    }

    const q = `
      SELECT
        dr.*,
        o.name AS offer_name,
        o.type AS offer_type,
        o.advertiser_name
      FROM distribution_rules dr
      JOIN offers o ON o.offer_id = dr.offer_id
      WHERE dr.tracking_link_id = $1
        AND dr.is_active = TRUE
      ORDER BY dr.priority ASC, dr.id ASC
    `;

    const result = await pool.query(q, [tracking_link_id]);
    res.json(apiSuccess({ items: result.rows }));
  } catch (err) {
    console.error("rules list error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

/* ------------------------------------------------------------------
   CREATE NEW RULE
   POST /api/distribution/rules
------------------------------------------------------------------ */

router.post("/rules", authJWT, async (req, res) => {
  try {
    let {
      pub_code,
      tracking_link_id,
      offer_id,
      geo = "ALL",
      carrier = "ALL",
      device = "ALL",
      priority = 1,
      weight = 100,
      is_fallback = false,
      required_params = [],
    } = req.body;

    if (!pub_code) return res.status(400).json(apiError("pub_code required"));
    if (!tracking_link_id)
      return res.status(400).json(apiError("tracking_link_id required"));
    if (!offer_id) return res.status(400).json(apiError("offer_id required"));

    // Normalise
    geo = geo || "ALL";
    carrier = carrier || "ALL";
    device = device || "ALL";
    priority = Number(priority) || 1;
    weight = is_fallback ? 0 : Number(weight) || 0;
    is_fallback = !!is_fallback;
    const reqParamsArray = normaliseRequiredParamsArray(required_params);

    // Server-side validation (fallback + duplicate)
    const validationError = await validateRuleOnServer({
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      is_fallback,
    });

    if (validationError) {
      return res.status(400).json(apiError(validationError));
    }

    const insert = `
      INSERT INTO distribution_rules
        (pub_code, tracking_link_id, offer_id, geo, carrier, device,
         priority, weight, is_fallback, is_active, required_params,
         created_at, updated_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10,NOW(),NOW())
      RETURNING *
    `;

    const result = await pool.query(insert, [
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      priority,
      weight,
      is_fallback,
      reqParamsArray,
    ]);

    res.json(apiSuccess({ item: result.rows[0] }));
  } catch (err) {
    console.error("create rule error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

/* ------------------------------------------------------------------
   UPDATE RULE
   PUT /api/distribution/rules/:id
------------------------------------------------------------------ */

router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const existingRes = await pool.query(
      "SELECT * FROM distribution_rules WHERE id = $1",
      [id]
    );
    if (!existingRes.rowCount) {
      return res.status(404).json(apiError("Rule not found"));
    }

    const current = existingRes.rows[0];

    let {
      pub_code = current.pub_code,
      tracking_link_id = current.tracking_link_id,
      offer_id = current.offer_id,
      geo = current.geo,
      carrier = current.carrier,
      device = current.device,
      priority = current.priority,
      weight = current.weight,
      is_fallback = current.is_fallback,
      is_active = current.is_active,
      status = current.status || "active",
      required_params = current.required_params || [],
    } = req.body;

    if (!pub_code) return res.status(400).json(apiError("pub_code required"));
    if (!tracking_link_id)
      return res.status(400).json(apiError("tracking_link_id required"));
    if (!offer_id) return res.status(400).json(apiError("offer_id required"));

    geo = geo || "ALL";
    carrier = carrier || "ALL";
    device = device || "ALL";
    priority = Number(priority) || 1;
    weight = is_fallback ? 0 : Number(weight) || 0;
    is_fallback = !!is_fallback;
    is_active = !!is_active;
    const reqParamsArray = normaliseRequiredParamsArray(required_params);

    const validationError = await validateRuleOnServer({
      idToIgnore: id,
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      is_fallback,
    });

    if (validationError) {
      return res.status(400).json(apiError(validationError));
    }

    const update = `
      UPDATE distribution_rules
      SET pub_code = $1,
          tracking_link_id = $2,
          offer_id = $3,
          geo = $4,
          carrier = $5,
          device = $6,
          priority = $7,
          weight = $8,
          is_fallback = $9,
          is_active = $10,
          status = $11,
          required_params = $12,
          updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `;

    const updated = (
      await pool.query(update, [
        pub_code,
        tracking_link_id,
        offer_id,
        geo,
        carrier,
        device,
        priority,
        weight,
        is_fallback,
        is_active,
        status,
        reqParamsArray,
        id,
      ])
    ).rows[0];

    res.json(apiSuccess({ item: updated }));
  } catch (err) {
    console.error("update rule error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

/* ------------------------------------------------------------------
   DELETE RULE (hard delete)
   DELETE /api/distribution/rules/:id
------------------------------------------------------------------ */

router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM distribution_rules WHERE id = $1", [id]);

    res.json(apiSuccess({ message: "Rule deleted" }));
  } catch (err) {
    console.error("delete rule error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

/* ------------------------------------------------------------------
   RESOLVE endpoint for real traffic (optional)
   GET /api/distribution/resolve?pub_id=PUB03&tracking_link_id=3&geo=BD...
------------------------------------------------------------------ */

function matchesTarget(rule, geo, carrier, device) {
  const geoOK = !geo || rule.geo === "ALL" || rule.geo === geo;
  const carrierOK =
    !carrier || rule.carrier === "ALL" || rule.carrier === carrier;
  const deviceOK =
    !device || rule.device === "ALL" || rule.device === device;
  return geoOK && carrierOK && deviceOK;
}

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

router.get("/resolve", async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier, device } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res
        .status(400)
        .json(apiError("Missing pub_id or tracking_link_id for resolve"));
    }

    const rulesQuery = `
      SELECT
        dr.*,
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
    `;

    const result = await pool.query(rulesQuery, [pub_id, tracking_link_id]);
    const rules = result.rows;

    if (!rules.length) {
      return res.json(apiError("No active rules"));
    }

    const matched = rules.filter((r) =>
      matchesTarget(r, geo, carrier, device)
    );

    if (!matched.length) {
      const fallback = rules.find((r) => r.is_fallback);
      return fallback
        ? res.json(
            apiSuccess({
              offer_id: fallback.offer_id,
              type: fallback.offer_type,
              url: fallback.offer_tracking_url,
              fallback: true,
            })
          )
        : res.json(apiError("No targeting match"));
    }

    const minPriority = matched[0].priority;
    const samePriority = matched.filter(
      (r) => r.priority === minPriority
    );

    const selected = pickByWeight(samePriority);

    return res.json(
      apiSuccess({
        offer_id: selected.offer_id,
        type: selected.offer_type,
        url: selected.offer_tracking_url,
        fallback: !!selected.is_fallback,
      })
    );
  } catch (err) {
    console.error("resolve error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

export default router;
