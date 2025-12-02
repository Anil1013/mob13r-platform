import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */

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

// auto-detect required params from tracking_url
async function buildRequiredParams(row) {
  let needsUpdate = false;

  let params =
    row.required_params && typeof row.required_params === "object"
      ? { ...row.required_params }
      : {};

  for (const k of Object.keys(DEFAULT_REQUIRED_PARAMS)) {
    if (!(k in params)) {
      params[k] = DEFAULT_REQUIRED_PARAMS[k];
      needsUpdate = true;
    }
  }

  // detect from URL
  try {
    if (row.tracking_url) {
      const [_, query] = row.tracking_url.split("?");
      if (query) {
        const qs = new URLSearchParams(query);
        qs.forEach((v, key) => {
          if (key in params && params[key] === false) {
            params[key] = true;
            needsUpdate = true;
          }
        });
      }
    }
  } catch (err) {
    console.error("params detect error:", err);
  }

  // update DB if anything changed
  if (needsUpdate) {
    try {
      await pool.query(
        `UPDATE publisher_tracking_links
         SET required_params=$1
         WHERE id=$2`,
        [params, row.id]
      );
    } catch (err) {
      console.error("params DB update error:", err);
    }
  }

  return params;
}

/* -----------------------------------------------------------
   OFFERS LIST  (🔥 IMPORTANT OFFER FIX)
   Frontend dropdown दिखाएगा: 
   "OFF01 — Offer Name"
   Backend को मिलेगा: "OFF01"
----------------------------------------------------------- */

router.get("/offers", authJWT, async (req, res) => {
  try {
    const q = `
      SELECT id, offer_id, name, advertiser_name, payout, status
      FROM offers
      WHERE status='active'
      ORDER BY id ASC
    `;
    const { rows } = await pool.query(q);

    // frontend value = offer_id ONLY
    const offers = rows.map((o) => ({
      id: o.offer_id,         // used as <option value="">
      offer_id: o.offer_id,   // OFF01
      name: o.name            // Game / Bindatest / Test Offer
    }));

    return res.json({ success: true, offers });
  } catch (err) {
    console.error("offers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------------------------------
   TRACKING LINKS
----------------------------------------------------------- */

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

    const arr = [];
    for (const r of rows) {
      const requiredParams = await buildRequiredParams(r);

      arr.push({
        tracking_link_id: r.id,
        tracking_id: r.name,
        pub_code: r.pub_code,
        publisher_name: r.publisher_name,
        geo: r.geo,
        carrier: r.carrier,
        type: r.type,
        payout: r.payout,
        tracking_url: r.tracking_url,
        required_params: requiredParams,
        status: r.status
      });
    }

    return res.json({ success: true, links: arr });
  } catch (err) {
    console.error("tracking-links error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------------------------------
   META
----------------------------------------------------------- */

router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const q = `
      SELECT *
      FROM publisher_tracking_links
      WHERE pub_code=$1 AND id=$2
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);
    if (!rows[0]) return res.json({ success: false, error: "not_found" });

    const r = rows[0];
    const requiredParams = await buildRequiredParams(r);

    return res.json({
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

/* -----------------------------------------------------------
   UPDATE REQUIRED PARAMS
----------------------------------------------------------- */

router.put("/update-required-params/:id", authJWT, async (req, res) => {
  try {
    const { required_params } = req.body;

    const q = `
      UPDATE publisher_tracking_links
      SET required_params=$1
      WHERE id=$2
      RETURNING *
    `;
    const { rows } = await pool.query(q, [
      required_params,
      req.params.id
    ]);

    res.json({ success: true, updated: rows[0] });
  } catch (err) {
    console.error("update required params:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------------------------------
   GET RULES
----------------------------------------------------------- */

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

    return res.json({ success: true, rules: rows });
  } catch (err) {
    console.error("rules error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------------------------------
   REMAINING %
----------------------------------------------------------- */

router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const q = `
      SELECT COALESCE(SUM(weight),0) AS total
      FROM distribution_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND status='active'
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    return res.json({
      success: true,
      remaining: 100 - Number(rows[0].total)
    });
  } catch (err) {
    console.error("remaining error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------------------------------
   ADD RULE (🔥 fixed for offer_id)
----------------------------------------------------------- */

router.post("/rules", authJWT, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      pub_id,
      tracking_link_id,
      offer_id,       // OFF01 / OFF02 / OFF03
      geo,
      carrier,
      weight,
      is_fallback,
      autoFill
    } = req.body;

    if (!offer_id || offer_id.trim() === "") {
      return res.json({ success: false, error: "offer_id_required" });
    }

    const cleanOffer = offer_id.trim();

    await client.query("BEGIN");

    // duplicate check
    const dup = await client.query(
      `SELECT id FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2
       AND offer_id=$3 AND geo=$4 AND carrier=$5
       AND status <> 'deleted'`,
      [pub_id, tracking_link_id, cleanOffer, norm(geo), norm(carrier)]
    );

    if (dup.rows.length) {
      await client.query("ROLLBACK");
      return res.json({ success: false, error: "duplicate_rule" });
    }

    // weight calculation
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

    const insert = await client.query(
      `INSERT INTO distribution_rules
       (pub_id, tracking_link_id, offer_id, geo, carrier, weight, is_fallback, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active')
       RETURNING *`,
      [
        pub_id,
        tracking_link_id,
        cleanOffer,
        norm(geo),
        norm(carrier),
        finalWeight,
        is_fallback
      ]
    );

    await client.query("COMMIT");
    return res.json({ success: true, rule: insert.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("add rule error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/* -----------------------------------------------------------
   UPDATE RULE (🔥 fixed for offer_id)
----------------------------------------------------------- */

router.put("/rules/:id", authJWT, async (req, res) => {
  const client = await pool.connect();

  try {
    const id = req.params.id;

    const {
      pub_id,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      weight,
      is_fallback,
      status,
      autoFill
    } = req.body;

    const cleanOffer = (offer_id || "").trim();
    if (!cleanOffer) return res.json({ success: false, error: "offer_id_required" });

    await client.query("BEGIN");

    // duplicate
    const dup = await client.query(
      `SELECT id FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 
       AND offer_id=$3 AND geo=$4 AND carrier=$5
       AND id <> $6 AND status <> 'deleted'`,
      [pub_id, tracking_link_id, cleanOffer, norm(geo), norm(carrier), id]
    );

    if (dup.rows.length) {
      await client.query("ROLLBACK");
      return res.json({ success: false, error: "duplicate_rule" });
    }

    // weight
    const used = await client.query(
      `SELECT COALESCE(SUM(weight),0) AS total
       FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 AND id <> $3 AND status='active'`,
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

    const upd = await client.query(
      `UPDATE distribution_rules
       SET offer_id=$1, geo=$2, carrier=$3, weight=$4, 
           is_fallback=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [
        cleanOffer,
        norm(geo),
        norm(carrier),
        finalWeight,
        is_fallback,
        status,
        id
      ]
    );

    await client.query("COMMIT");
    return res.json({ success: true, rule: upd.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("update rule error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/* -----------------------------------------------------------
   DELETE RULE
----------------------------------------------------------- */

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

/* ----------------------------------------------------------- */

export default router;
