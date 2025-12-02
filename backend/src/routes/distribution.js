import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ===================================================================
   HELPERS
=================================================================== */

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
   0) OFFERS LIST (Frontend dropdown expects: id = INT, label = OFF03 – NAME)
=================================================================== */

router.get("/offers", authJWT, async (req, res) => {
  try {
    const q = `
      SELECT id, offer_id, name, advertiser_name, payout, status
      FROM offers
      WHERE status = 'active'
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q);

    // Frontend dropdown FIX: id = INTEGER
    const offers = rows.map((o) => ({
      id: o.id,                        // INT (for backend rule save)
      label: `${o.offer_id} – ${o.name}`, // For display: OFF03 – Game
      offer_id: o.offer_id,
      name: o.name,
      payout: o.payout,
      advertiser_name: o.advertiser_name,
      status: o.status,
    }));

    return res.json({ success: true, offers });
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
        status: r.status,
        tracking_id: r.tracking_id,
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
        required_params: requiredParams,
      },
    });
  } catch (err) {
    console.error("meta error:", err);
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
      offer_id, // ← INT
      weight,
      geo,
      carrier,
      is_fallback,
      autoFill,
    } = req.body;

    if (!offer_id || isNaN(Number(offer_id))) {
      return res.json({ success: false, error: "offer_id_invalid" });
    }

    await client.query("BEGIN");

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    const dup = await client.query(
      `SELECT id FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2
       AND offer_id=$3 AND UPPER(geo)=$4 AND UPPER(carrier)=$5
       AND status <> 'deleted'`,
      [pub_id, tracking_link_id, Number(offer_id), nGeo, nCarrier]
    );

    if (dup.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({ success: false, error: "duplicate_rule" });
    }

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

    const result = await client.query(
      `INSERT INTO distribution_rules
       (pub_id, tracking_link_id, offer_id, weight, geo, carrier, is_fallback, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active')
       RETURNING *`,
      [pub_id, tracking_link_id, Number(offer_id), finalWeight, nGeo, nCarrier, is_fallback]
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
      offer_id, // ← INT
      weight,
      geo,
      carrier,
      is_fallback,
      status,
      autoFill,
    } = req.body;

    if (!offer_id || isNaN(Number(offer_id))) {
      return res.json({ success: false, error: "offer_id_invalid" });
    }

    await client.query("BEGIN");

    const nGeo = norm(geo);
    const nCarrier = norm(carrier);

    const dup = await client.query(
      `SELECT id FROM distribution_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3
       AND UPPER(geo)=$4 AND UPPER(carrier)=$5 AND id <> $6
       AND status <> 'deleted'`,
      [pub_id, tracking_link_id, Number(offer_id), nGeo, nCarrier, id]
    );

    if (dup.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({ success: false, error: "duplicate_rule" });
    }

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

    const result = await client.query(
      `UPDATE distribution_rules
       SET offer_id=$1, weight=$2, geo=$3, carrier=$4,
       is_fallback=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [
        Number(offer_id),
        finalWeight,
        nGeo,
        nCarrier,
        is_fallback,
        status || "active",
        id,
      ]
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
   DELETE RULE
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
