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

// default required params (tracking ke liye)
const DEFAULT_REQUIRED_PARAMS = {
  click_id: false,
  sub1: false,
  sub2: false,
  sub3: false,
  sub4: false,
  sub5: false,
  msisdn: false,
  ip: true,
  ua: true,
  device: false,
};

// tracking_url se query params nikal ke, defaults + DB value merge
async function buildRequiredParams(row) {
  let needsUpdate = false;

  let params =
    row.required_params && typeof row.required_params === "object"
      ? { ...row.required_params }
      : {};

  // merge defaults
  for (const key of Object.keys(DEFAULT_REQUIRED_PARAMS)) {
    if (!(key in params)) {
      params[key] = DEFAULT_REQUIRED_PARAMS[key];
      needsUpdate = true;
    }
  }

  // detect from tracking_url
  try {
    if (row.tracking_url) {
      const parts = row.tracking_url.split("?");
      if (parts[1]) {
        const qs = new URLSearchParams(parts[1]);
        qs.forEach((v, k) => {
          if (k in params && params[k] === false) {
            params[k] = true;
            needsUpdate = true;
          }
        });
      }
    }
  } catch (e) {
    console.error("buildRequiredParams ERROR", e);
  }

  // update DB
  if (needsUpdate) {
    try {
      await pool.query(
        `UPDATE publisher_tracking_links
         SET required_params = $1
         WHERE id = $2`,
        [params, row.id]
      );
    } catch (e) {
      console.error("required_params DB update error", e);
    }
  }

  return params;
}

/* ===================================================================
   NEW: OFFER LIST FOR DROPDOWN (🔥 FIX)
=================================================================== */

router.get("/offers", authJWT, async (req, res) => {
  try {
    const q = `
      SELECT
        id,
        offer_id,
        name,
        advertiser_name,
        payout,
        status
      FROM offers
      WHERE status = 'active'
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q);

    return res.json({ success: true, offers: rows });
  } catch (err) {
    console.error("offers list error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   1) TRACKING LINKS
=================================================================== */

router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT *
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;
    const { rows } = await pool.query(q, [pub_id]);

    const links = [];
    for (const r of rows) {
      const requiredParams = await buildRequiredParams(r);

      links.push({
        tracking_link_id: r.id,
        pub_code: r.pub_code,
        publisher_id: r.publisher_id,
        publisher_name: r.publisher_name,
        name: r.name,
        geo: r.geo,
        carrier: r.carrier,
        type: r.type,
        payout: r.payout,
        tracking_url: r.tracking_url,
        required_params: requiredParams,
        cap_daily: r.cap_daily,
        cap_total: r.cap_total,
        status: r.status
      });
    }

    res.json({ success: true, links });
  } catch (err) {
    console.error("tracking-links error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   2) META
=================================================================== */

router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

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
    const requiredParams = await buildRequiredParams(r);

    res.json({
      success: true,
      meta: {
        tracking_link_id: r.id,
        pub_code: r.pub_code,
        geo: r.geo,
        carrier: r.carrier,
        tracking_url: r.tracking_url,
        required_params: requiredParams
      }
    });
  } catch (err) {
    console.error("meta error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   2.5) UPDATE REQUIRED PARAMS
=================================================================== */

router.put("/update-required-params/:id", authJWT, async (req, res) => {
  try {
    const { required_params } = req.body;

    const q = `
      UPDATE publisher_tracking_links
      SET required_params = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, required_params
    `;

    const { rows } = await pool.query(q, [required_params, req.params.id]);
    res.json({ success: true, updated: rows[0] });
  } catch (err) {
    console.error("update-required-params:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   3) GET RULES
=================================================================== */

router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const q = `
      SELECT *
      FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND status <> 'deleted'
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    res.json({ success: true, rules: rows });
  } catch (err) {
    console.error("rules error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   4) REMAINING %
=================================================================== */

router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;
    const q = `
      SELECT COALESCE(SUM(weight),0) AS total
      FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND status='active'
    `;
    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    res.json({ success: true, remaining: 100 - Number(rows[0].total) });
  } catch (err) {
    console.error("remaining error:", err);
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
      autoFill
    } = req.body;

    await client.query("BEGIN");

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    // DUPLICATE CHECK
    const dup = await client.query(
      `SELECT id FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2
       AND offer_id=$3 AND UPPER(geo)=$4 AND UPPER(carrier)=$5
       AND status <> 'deleted'`,
      [pub_id, tracking_link_id, offer_id, nGeo, nCarrier]
    );

    if (dup.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({ success: false, error: "duplicate_rule" });
    }

    // SMART WEIGHT
    const used = await client.query(
      `SELECT COALESCE(SUM(weight),0) AS total
       FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 AND status='active'`,
      [pub_id, tracking_link_id]
    );

    let finalWeight = Number(weight);
    if (!finalWeight || autoFill) {
      finalWeight = Math.max(100 - Number(used.rows[0].total), 0);
    }

    if (Number(used.rows[0].total) + finalWeight > 100) {
      await client.query("ROLLBACK");
      return res.json({ success: false, error: "weight_exceeded" });
    }

    // INSERT
    const result = await client.query(
      `INSERT INTO distribution_rules
       (pub_id, tracking_link_id, offer_id, weight, geo, carrier, is_fallback, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active')
       RETURNING *`,
      [pub_id, tracking_link_id, offer_id, finalWeight, nGeo, nCarrier, is_fallback]
    );

    await client.query("COMMIT");
    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("add rule error:", err);
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
      autoFill
    } = req.body;

    await client.query("BEGIN");

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    // DUPLICATE CHECK
    const dup = await client.query(
      `SELECT id FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3
       AND UPPER(geo)=$4 AND UPPER(carrier)=$5 AND id <> $6
       AND status <> 'deleted'`,
      [pub_id, tracking_link_id, offer_id, nGeo, nCarrier, id]
    );

    if (dup.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({ success: false, error: "duplicate_rule" });
    }

    // SMART WEIGHT
    const used = await client.query(
      `SELECT COALESCE(SUM(weight),0) AS total
       FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 AND id <> $3
       AND status='active'`,
      [pub_id, tracking_link_id, id]
    );

    let finalWeight = Number(weight);
    if (!finalWeight || autoFill) {
      finalWeight = Math.max(100 - Number(used.rows[0].total), 0);
    }

    if (Number(used.rows[0].total) + finalWeight > 100) {
      await client.query("ROLLBACK");
      return res.json({ success: false, error: "weight_exceeded" });
    }

    // UPDATE
    const result = await client.query(
      `UPDATE distribution_rules
       SET offer_id=$1, weight=$2, geo=$3, carrier=$4,
       is_fallback=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [offer_id, finalWeight, nGeo, nCarrier, is_fallback, status, id]
    );

    await client.query("COMMIT");
    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("update rule error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/* ===================================================================
   NEW: CLICK HANDLER (🔥 FIX FOR TRACKING URL)
=================================================================== */

router.get("/click", async (req, res) => {
  try {
    return res.json({
      success: true,
      received_params: req.query,
      message: "Click handler active"
    });
  } catch (err) {
    console.error("click error:", err);
    res.status(500).send("Internal error");
  }
});

/* ===================================================================
   7) DELETE RULE
=================================================================== */

router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(
      `UPDATE distribution_rules SET status='deleted' WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("delete rule error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ===================================================================
   EXPORT
=================================================================== */
export default router;
