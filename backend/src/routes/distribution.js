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

/**
 * Validate rule on server
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
  // Fallback uniqueness
  if (is_fallback) {
    const fallbackCheck = await pool.query(
      `
      SELECT id
      FROM distribution_rules
      WHERE pub_code=$1
        AND tracking_link_id=$2
        AND is_fallback=TRUE
        AND is_active=TRUE
        ${idToIgnore ? "AND id<>$3" : ""}
    `,
      idToIgnore
        ? [pub_code, tracking_link_id, idToIgnore]
        : [pub_code, tracking_link_id]
    );

    if (fallbackCheck.rowCount > 0) {
      return "Fallback rule already exists.";
    }
  }

  // Duplicate rule
  const dupCheck = await pool.query(
    `
    SELECT id FROM distribution_rules
    WHERE pub_code=$1
      AND tracking_link_id=$2
      AND offer_id=$3
      AND geo=$4
      AND carrier=$5
      AND device=$6
      AND is_active=TRUE
      ${idToIgnore ? "AND id<>$7" : ""}
  `,
    idToIgnore
      ? [pub_code, tracking_link_id, offer_id, geo, carrier, device, idToIgnore]
      : [pub_code, tracking_link_id, offer_id, geo, carrier, device]
  );

  if (dupCheck.rowCount > 0) {
    return "Duplicate rule exists.";
  }

  return null;
}

/* ------------------------------------------------------------------
   GET TRACKING LINKS
------------------------------------------------------------------ */

router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_code } = req.query;
    if (!pub_code) return res.status(400).json(apiError("pub_code required"));

    const q = `
      SELECT *
      FROM publisher_tracking_links
      WHERE pub_code=$1 AND status='active'
      ORDER BY id ASC
    `;

    const result = await pool.query(q, [pub_code]);
    res.json(apiSuccess({ items: result.rows }));
  } catch (err) {
    console.error(err);
    res.status(500).json(apiError("Internal server error"));
  }
});

/* ------------------------------------------------------------------
   SAVE REQUIRED PARAMS (checkbox UI)
------------------------------------------------------------------ */

router.put("/tracking-links/:id/params", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { required_params } = req.body;

    const result = await pool.query(
      `
      UPDATE publisher_tracking_links
      SET required_params=$1, updated_at=NOW()
      WHERE id=$2
      RETURNING *
    `,
      [required_params, id]
    );

    res.json(apiSuccess({ item: result.rows[0] }));
  } catch (err) {
    console.error("save params error:", err);
    res.status(500).json(apiError("Internal server error"));
  }
});

/* ------------------------------------------------------------------
   OFFER LIST
------------------------------------------------------------------ */

router.get("/offers", authJWT, async (req, res) => {
  try {
    const { search = "" } = req.query;

    const q = `
      SELECT offer_id, advertiser_name, name, type, status
      FROM offers
      WHERE status='active'
        AND (
          $1='' OR LOWER(offer_id) LIKE LOWER('%'||$1||'%')
          OR LOWER(name) LIKE LOWER('%'||$1||'%')
        )
      ORDER BY offer_id ASC
      LIMIT 200
    `;

    const result = await pool.query(q, [search.trim()]);
    res.json(apiSuccess({ items: result.rows }));
  } catch (err) {
    console.error("offers error:", err);
    res.status(500).json(apiError("Internal server error"));
  }
});

/* ------------------------------------------------------------------
   LIST RULES (with advertiser + offer type)
------------------------------------------------------------------ */

router.get("/rules", authJWT, async (req, res) => {
  try {
    const { tracking_link_id } = req.query;

    const q = `
      SELECT 
        dr.*,
        o.name AS offer_name,
        o.type AS offer_type,
        o.advertiser_name
      FROM distribution_rules dr
      JOIN offers o ON o.offer_id = dr.offer_id
      WHERE dr.tracking_link_id=$1 AND dr.is_active=TRUE
      ORDER BY dr.priority ASC, dr.id ASC
    `;

    const result = await pool.query(q, [tracking_link_id]);
    res.json(apiSuccess({ items: result.rows }));
  } catch (err) {
    console.error("rules error:", err);
    res.status(500).json(apiError("Internal server error"));
  }
});

/* ------------------------------------------------------------------
   ADD RULE
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

    const validationError = await validateRuleOnServer({
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      is_fallback,
    });

    if (validationError) return res.status(400).json(apiError(validationError));

    const result = await pool.query(
      `
      INSERT INTO distribution_rules
      (pub_code, tracking_link_id, offer_id, geo, carrier, device, priority, weight, is_fallback, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE)
      RETURNING *
    `,
      [
        pub_code,
        tracking_link_id,
        offer_id,
        geo,
        carrier,
        device,
        priority,
        weight,
        is_fallback,
      ]
    );

    res.json(apiSuccess({ item: result.rows[0] }));
  } catch (err) {
    console.error("create rule error:", err);
    res.status(500).json(apiError("Internal server error"));
  }
});

/* ------------------------------------------------------------------
   UPDATE RULE
------------------------------------------------------------------ */

router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const current = await pool.query(
      `SELECT * FROM distribution_rules WHERE id=$1`,
      [id]
    );

    if (!current.rowCount) return res.status(404).json(apiError("Not found"));

    const old = current.rows[0];

    let {
      pub_code = old.pub_code,
      tracking_link_id = old.tracking_link_id,
      offer_id = old.offer_id,
      geo = old.geo,
      carrier = old.carrier,
      device = old.device,
      priority = old.priority,
      weight = old.weight,
      is_fallback = old.is_fallback,
      is_active = old.is_active,
    } = req.body;

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

    if (validationError) return res.status(400).json(apiError(validationError));

    const result = await pool.query(
      `
      UPDATE distribution_rules
      SET pub_code=$1, tracking_link_id=$2, offer_id=$3, geo=$4,
          carrier=$5, device=$6, priority=$7, weight=$8,
          is_fallback=$9, is_active=$10, updated_at=NOW()
      WHERE id=$11
      RETURNING *
    `,
      [
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
        id,
      ]
    );

    res.json(apiSuccess({ item: result.rows[0] }));
  } catch (err) {
    console.error("update rule error:", err);
    res.status(500).json(apiError("Internal server error"));
  }
});

/* ------------------------------------------------------------------
   DELETE RULE
------------------------------------------------------------------ */

router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM distribution_rules WHERE id=$1", [
      req.params.id,
    ]);

    res.json(apiSuccess({ message: "Rule deleted" }));
  } catch (err) {
    console.error("delete rule error:", err);
    res.status(500).json(apiError("Internal server error"));
  }
});

export default router;
