// backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ============================================================
   HELPERS
============================================================ */

const norm = (v) =>
  !v || v.trim() === "" ? "ALL" : v.trim().toUpperCase();

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

async function buildRequiredParams(row) {
  let needsUpdate = false;

  let params =
    row.required_params && typeof row.required_params === "object"
      ? { ...row.required_params }
      : {};

  for (const key of Object.keys(DEFAULT_REQUIRED_PARAMS)) {
    if (!(key in params)) {
      params[key] = DEFAULT_REQUIRED_PARAMS[key];
      needsUpdate = true;
    }
  }

  try {
    if (row.tracking_url?.includes("?")) {
      const qs = new URLSearchParams(row.tracking_url.split("?")[1]);
      qs.forEach((v, k) => {
        if (k in params && params[k] === false) {
          params[k] = true;
          needsUpdate = true;
        }
      });
    }
  } catch (e) {
    console.error("Required params parse error", e);
  }

  if (needsUpdate) {
    try {
      await pool.query(
        `UPDATE publisher_tracking_links
         SET required_params=$1
         WHERE id=$2`,
        [params, row.id]
      );
    } catch (e) {
      console.error("Required params update error", e);
    }
  }

  return params;
}

/* ============================================================
   OFFERS LIST (FINAL FIXED)
   returns → offer_id + name
   frontend expects:
   value = offer_id (OFF01)
   display = "OFF01 — Game"
============================================================ */

router.get("/offers", authJWT, async (req, res) => {
  try {
    const q = `
      SELECT offer_id, name, advertiser_name, payout, status
      FROM offers
      WHERE status='active'
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q);

    const offers = rows.map((o) => ({
      id: o.offer_id,        // frontend value = OFF01
      offer_id: o.offer_id,  // OFF01
      name: o.name,          // Game
      advertiser_name: o.advertiser_name,
      payout: o.payout,
      status: o.status,
    }));

    return res.json({ success: true, offers });
  } catch (err) {
    console.error("offers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   TRACKING LINKS
============================================================ */

router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT *
      FROM publisher_tracking_links
      WHERE pub_code=$1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);

    const links = [];

    for (const r of rows) {
      const required = await buildRequiredParams(r);

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
        required_params: required,
        cap_daily: r.cap_daily,
        cap_total: r.cap_total,
        status: r.status,
        tracking_id: r.tracking_id,
      });
    }

    res.json({ success: true, links });
  } catch (err) {
    console.error("tracking-links:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   META DETAILS
============================================================ */

router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const q = `
      SELECT *
      FROM publisher_tracking_links
      WHERE pub_code=$1 AND id=$2
      LIMIT 1
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    if (!rows[0])
      return res.json({ success: false, error: "not_found" });

    const r = rows[0];
    const required = await buildRequiredParams(r);

    res.json({
      success: true,
      meta: {
        pub_code: r.pub_code,
        tracking_link_id: r.id,
        geo: r.geo,
        carrier: r.carrier,
        tracking_url: r.tracking_url,
        required_params: required,
      },
    });
  } catch (err) {
    console.error("meta:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   UPDATE REQUIRED PARAMS
============================================================ */

router.put("/update-required-params/:id", authJWT, async (req, res) => {
  try {
    const { required_params } = req.body;

    const q = `
      UPDATE publisher_tracking_links
      SET required_params=$1, updated_at=NOW()
      WHERE id=$2
      RETURNING id
    `;

    const { rows } = await pool.query(q, [
      required_params,
      req.params.id,
    ]);

    res.json({ success: true, updated: rows[0] });
  } catch (err) {
    console.error("update-required-params:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   GET RULES
============================================================ */

router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const q = `
      SELECT *
      FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2
      AND status <> 'deleted'
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    res.json({ success: true, rules: rows });
  } catch (err) {
    console.error("rules:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   REMAINING WEIGHT
============================================================ */

router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const q = `
      SELECT COALESCE(SUM(weight),0) AS total
      FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2
        AND status='active'
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    const used = Number(rows[0].total || 0);
    res.json({ success: true, remaining: 100 - used });
  } catch (err) {
    console.error("remaining:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   ADD RULE (FINAL FIX)
   offer_id MUST be string (OFF01)
============================================================ */

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
      autoFill,
    } = req.body;

    const cleanOfferId = String(offer_id || "").trim(); // <-- OFF01

    if (!pub_id || !tracking_link_id || !cleanOfferId)
      return res.json({
        success: false,
        error: "missing_fields",
      });

    await client.query("BEGIN");

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    const dup = await client.query(
      `SELECT id FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3
       AND UPPER(geo)=$4 AND UPPER(carrier)=$5
       AND status <> 'deleted'`,
      [pub_id, tracking_link_id, cleanOfferId, nGeo, nCarrier]
    );

    if (dup.rows.length)
      return res.json({ success: false, error: "duplicate_rule" });

    const usedRes = await client.query(
      `SELECT COALESCE(SUM(weight),0) AS total
       FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 AND status='active'`,
      [pub_id, tracking_link_id]
    );

    const used = Number(usedRes.rows[0].total || 0);

    let finalWeight = Number(weight);
    if (!finalWeight || autoFill)
      finalWeight = Math.max(100 - used, 0);

    if (used + finalWeight > 100)
      return res.json({ success: false, error: "weight_exceeded" });

    const insert = await client.query(
      `INSERT INTO distribution_rules
       (pub_id, tracking_link_id, offer_id, weight, geo, carrier, is_fallback, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active')
       RETURNING *`,
      [
        pub_id,
        tracking_link_id,
        cleanOfferId,
        finalWeight,
        nGeo,
        nCarrier,
        !!is_fallback,
      ]
    );

    await client.query("COMMIT");
    res.json({ success: true, rule: insert.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("add rule:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/* ============================================================
   UPDATE RULE (Final Fix)
============================================================ */

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
      autoFill,
    } = req.body;

    const cleanOfferId = String(offer_id || "").trim();

    if (!pub_id || !tracking_link_id || !cleanOfferId)
      return res.json({
        success: false,
        error: "missing_fields",
      });

    await client.query("BEGIN");

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    const dup = await client.query(
      `SELECT id FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2
       AND offer_id=$3 AND UPPER(geo)=$4 AND UPPER(carrier)=$5
       AND id <> $6 AND status <> 'deleted'`,
      [
        pub_id,
        tracking_link_id,
        cleanOfferId,
        nGeo,
        nCarrier,
        id,
      ]
    );

    if (dup.rows.length)
      return res.json({ success: false, error: "duplicate_rule" });

    const usedRes = await client.query(
      `SELECT COALESCE(SUM(weight),0) AS total
       FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2
         AND id <> $3 AND status='active'`,
      [pub_id, tracking_link_id, id]
    );

    const used = Number(usedRes.rows[0].total || 0);

    let finalWeight = Number(weight);
    if (!finalWeight || autoFill)
      finalWeight = Math.max(100 - used, 0);

    if (used + finalWeight > 100)
      return res.json({ success: false, error: "weight_exceeded" });

    const updated = await client.query(
      `UPDATE distribution_rules
       SET offer_id=$1, weight=$2, geo=$3, carrier=$4,
           is_fallback=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [
        cleanOfferId,
        finalWeight,
        nGeo,
        nCarrier,
        !!is_fallback,
        status || "active",
        id,
      ]
    );

    await client.query("COMMIT");

    res.json({ success: true, rule: updated.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("update rule:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/* ============================================================
   DELETE RULE
============================================================ */

router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(
      `UPDATE distribution_rules SET status='deleted' WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("delete:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   EXPORT
============================================================ */

export default router;
