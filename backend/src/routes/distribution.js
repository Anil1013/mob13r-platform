// File: backend/src/routes/distribution.js

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

function matchesTarget(rule, geo, carrier, device) {
  const geoUpper = geo ? String(geo).toUpperCase() : null;
  const carrierUpper = carrier ? String(carrier).toUpperCase() : null;
  const deviceUpper = device ? String(device).toUpperCase() : null;

  const ruleGeo = rule.geo ? String(rule.geo).toUpperCase() : "ALL";
  const ruleCarrier = rule.carrier ? String(rule.carrier).toUpperCase() : "ALL";
  const ruleDevice = rule.device ? String(rule.device).toUpperCase() : "ALL";

  const geoOK = !geoUpper || ruleGeo === "ALL" || ruleGeo === geoUpper;
  const carrierOK =
    !carrierUpper || ruleCarrier === "ALL" || ruleCarrier === carrierUpper;
  const deviceOK =
    !deviceUpper || ruleDevice === "ALL" || ruleDevice === deviceUpper;

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

function appendQueryParams(baseUrl, params = {}) {
  if (!baseUrl) return baseUrl;

  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return baseUrl;

  const hasQuery = baseUrl.includes("?");
  const glue = hasQuery ? "&" : "?";
  const qs = entries
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
    )
    .join("&");

  return `${baseUrl}${glue}${qs}`;
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
    const fallbackCheck = await pool.query(
      `
      SELECT id
      FROM distribution_rules
      WHERE pub_code = $1
        AND tracking_link_id = $2
        AND is_fallback = TRUE
        AND is_active = TRUE
        ${idToIgnore ? "AND id <> $3" : ""}
    `,
      idToIgnore
        ? [pub_code, tracking_link_id, idToIgnore]
        : [pub_code, tracking_link_id]
    );

    if (fallbackCheck.rowCount > 0) {
      return "A fallback rule already exists for this tracking link.";
    }
  }

  // 2) Duplicate targeting rule
  const dupCheck = await pool.query(
    `
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
  `,
    idToIgnore
      ? [pub_code, tracking_link_id, offer_id, geo, carrier, device, idToIgnore]
      : [pub_code, tracking_link_id, offer_id, geo, carrier, device]
  );

  if (dupCheck.rowCount > 0) {
    return "Duplicate rule: same Offer + Geo + Carrier + Device already exists.";
  }

  return null; // no error
}

/**
 * Core resolver used by /resolve and /click
 */
async function resolveOffer({ pub_code, tracking_link_id, geo, carrier, device }) {
  const rulesQuery = `
    SELECT
  dr.*,
  o.name AS offer_name,
  o.type AS offer_type,
  o.tracking_url AS offer_tracking_url,
  o.advertiser_name,
  p.name AS publisher_name
FROM distribution_rules dr
JOIN offers o 
  ON o.offer_id = dr.offer_id
LEFT JOIN publishers p 
  ON p.id = (
      SELECT publisher_id 
      FROM publisher_tracking_links 
      WHERE id = dr.tracking_link_id
      LIMIT 1
  )

    WHERE dr.pub_code = $1
      AND dr.tracking_link_id = $2
      AND dr.is_active = TRUE
      AND dr.status = 'active'
    ORDER BY dr.priority ASC, dr.id ASC
  `;

  const { rows: rules } = await pool.query(rulesQuery, [
    pub_code,
    tracking_link_id,
  ]);

  if (!rules.length) {
    return { error: "No active rules" };
  }

  const matched = rules.filter((r) => matchesTarget(r, geo, carrier, device));

  if (!matched.length) {
    const fallback = rules.find((r) => r.is_fallback);
    if (!fallback) {
      return { error: "No targeting match" };
    }
    return {
      offer_id: fallback.offer_id,
      offer_type: fallback.offer_type,
      url: fallback.offer_tracking_url,
      rule: fallback,
      fallback: true,
    };
  }

  const minPriority = matched[0].priority;
  const samePriority = matched.filter((r) => r.priority === minPriority);
  const selected = pickByWeight(samePriority) || samePriority[0];

  return {
    offer_id: selected.offer_id,
    offer_type: selected.offer_type,
    url: selected.offer_tracking_url,
    rule: selected,
    fallback: !!selected.is_fallback,
  };
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
   UPDATE REQUIRED PARAMS FOR A TRACKING LINK
   PUT /api/distribution/tracking-links/:id/params
------------------------------------------------------------------ */

router.put("/tracking-links/:id/params", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { required_params } = req.body;

    const normalized =
      required_params && typeof required_params === "object"
        ? required_params
        : {};

    const update = `
      UPDATE publisher_tracking_links
      SET required_params = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pool.query(update, [normalized, id]);
    if (!rows.length) {
      return res.status(404).json(apiError("Tracking link not found"));
    }

    res.json(apiSuccess({ item: rows[0] }));
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
        advertiser_name,
        type,
        status
      FROM offers
      WHERE status = 'active'
        AND (
          $1 = '' OR
          LOWER(offer_id) LIKE LOWER('%' || $1 || '%') OR
          LOWER(name) LIKE LOWER('%' || $1 || '%') OR
          LOWER(advertiser_name) LIKE LOWER('%' || $1 || '%')
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
        o.advertiser_name,
        ptl.publisher_name
      FROM distribution_rules dr
      JOIN offers o ON o.offer_id = dr.offer_id
      LEFT JOIN publisher_tracking_links ptl ON ptl.id = dr.tracking_link_id
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
    weight = Number(weight) || 0;
    is_fallback = !!is_fallback;

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
         priority, weight, is_fallback, is_active, status, created_at, updated_at)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,'active',NOW(),NOW())
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
    } = req.body;

    if (!pub_code) return res.status(400).json(apiError("pub_code required"));
    if (!tracking_link_id)
      return res.status(400).json(apiError("tracking_link_id required"));
    if (!offer_id) return res.status(400).json(apiError("offer_id required"));

    geo = geo || "ALL";
    carrier = carrier || "ALL";
    device = device || "ALL";
    priority = Number(priority) || 1;
    weight = Number(weight) || 0;
    is_fallback = !!is_fallback;
    is_active = !!is_active;

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
          updated_at = NOW()
      WHERE id = $12
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
   DELETE RULE  (hard delete)
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
   PUBLIC RESOLVE ENDPOINT (JSON)
   GET /api/distribution/resolve?pub_id=PUB03&tracking_link_id=3&geo=BD&carrier=Robi
------------------------------------------------------------------ */

router.get("/resolve", async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier, device } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res
        .status(400)
        .json(apiError("Missing pub_id or tracking_link_id for resolve"));
    }

    const result = await resolveOffer({
      pub_code: pub_id,
      tracking_link_id,
      geo,
      carrier,
      device,
    });

    if (result.error) {
      return res.json(apiError(result.error));
    }

    return res.json(
      apiSuccess({
        offer_id: result.offer_id,
        type: result.offer_type,
        url: result.url,
        fallback: result.fallback,
      })
    );
  } catch (err) {
    console.error("resolve error:", err);
    res
      .status(500)
      .json(apiError("Internal server error", { error: err.message }));
  }
});

/* ------------------------------------------------------------------
   PUBLIC CLICK ENDPOINT FOR PUBLISHERS
   Example publisher URL:
   https://backend.mob13r.com/click?pub_id=PUB03&geo=BD&carrier=Robi&click_id=123
   This endpoint:
   - Finds matching tracking link
   - Applies distribution rules
   - Appends required params
   - 302 redirects to offer.tracking_url
------------------------------------------------------------------ */

router.get("/click", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;

    if (!pub_id) {
      return res
        .status(400)
        .send("Missing pub_id. Example: /click?pub_id=PUB03&geo=BD&carrier=Robi");
    }

    // Auto-detect device from UA (can be overridden via ?device=)
    const uaHeader = req.headers["user-agent"] || "";
    let deviceAuto = "ALL";
    if (/Android/i.test(uaHeader)) deviceAuto = "ANDROID";
    else if (/iPhone|iPad|iPod/i.test(uaHeader)) deviceAuto = "IOS";
    else if (/Windows|Macintosh|Linux/i.test(uaHeader)) deviceAuto = "DESKTOP";

    const device = (req.query.device || deviceAuto || "ALL").toString();

    // 1) Find appropriate tracking link for this pub + geo + carrier
    const trackingSql = `
      SELECT *
      FROM publisher_tracking_links
      WHERE pub_code = $1
        AND status = 'active'
      ORDER BY
        CASE
          WHEN UPPER(geo) = UPPER($2) THEN 0
          WHEN geo = 'ALL' THEN 1
          ELSE 2
        END,
        CASE
          WHEN UPPER(carrier) = UPPER($3) THEN 0
          WHEN carrier = 'ALL' THEN 1
          ELSE 2
        END,
        id ASC
      LIMIT 1
    `;

    const { rows: trackingRows } = await pool.query(trackingSql, [
      pub_id,
      geo || "",
      carrier || "",
    ]);

    if (!trackingRows.length) {
      return res.status(404).send("No tracking link configured for this pub.");
    }

    const link = trackingRows[0];

    // 2) Resolve best offer using distribution rules
    const resolution = await resolveOffer({
      pub_code: pub_id,
      tracking_link_id: link.id,
      geo,
      carrier,
      device,
    });

    if (resolution.error || !resolution.url) {
      return res
        .status(302)
        .redirect(link.landing_page_url || link.tracking_url || "https://google.com");
    }

    // 3) Build params to forward based on required_params JSONB
    const ipHeader =
      (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
        .toString()
        .split(",")[0]
        .trim();

    const q = req.query;

    const actual = {
      ip: ipHeader,
      ua: uaHeader,
      device,
      msisdn: q.msisdn || "",
      click_id: q.click_id || "",
      sub1: q.sub1 || "",
      sub2: q.sub2 || "",
      sub3: q.sub3 || "",
      sub4: q.sub4 || "",
      sub5: q.sub5 || "",
    };

    const required = link.required_params || {};
    const forward = {};

    for (const key of Object.keys(required)) {
      if (required[key]) {
        forward[key] = actual[key] || "";
      }
    }

    const redirectUrl = appendQueryParams(resolution.url, forward);

    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error("click error:", err);
    res.status(500).send("Internal server error");
  }
});

export default router;
