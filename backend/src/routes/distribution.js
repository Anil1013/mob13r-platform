// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/* ===========================================================
   META (tracking links)
   =========================================================== */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const q = `
      SELECT 
        id AS tracking_link_id,
        pub_code,
        publisher_id,
        publisher_name,
        geo,
        carrier,
        type,
        tracking_url,
        status
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);
    return res.json(rows);

  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   ACTIVE OFFERS
   =========================================================== */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    let q = `
      SELECT 
        id,
        offer_id,
        name AS offer_name,
        advertiser_name,
        type,
        payout,
        tracking_url,
        status
      FROM offers
      WHERE status = 'active'
    `;

    const params = [];

    if (exclude) {
      const ids = exclude
        .split(",")
        .map(Number)
        .filter(Boolean);

      if (ids.length) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
        q += ` AND id NOT IN (${placeholders})`;
        params.push(...ids);
      }
    }

    q += " ORDER BY id ASC";

    const { rows } = await pool.query(q, params);
    return res.json(rows);

  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   RULES LIST
   =========================================================== */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const q = `SELECT * FROM traffic_rules WHERE pub_id = $1 ORDER BY id ASC`;

    const { rows } = await pool.query(q, [pub_id]);
    return res.json(rows);

  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   REMAINING % (sum of weights)
   =========================================================== */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    let q = `
      SELECT COALESCE(SUM(weight),0) AS sumw
      FROM traffic_rules
      WHERE pub_id = $1 AND status='active'
    `;

    const params = [pub_id];

    if (tracking_link_id) {
      q = `
        SELECT COALESCE(SUM(weight),0) AS sumw
        FROM traffic_rules
        WHERE pub_id = $1 AND tracking_link_id = $2 AND status='active'
      `;
      params.push(tracking_link_id);
    }

    const { rows } = await pool.query(q, params);
    const sumw = Number(rows[0]?.sumw || 0);
    return res.json({ sum: sumw, remaining: 100 - sumw });

  } catch (err) {
    console.error("REMAINING ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   GLOBAL OVERVIEW
   =========================================================== */
router.get("/overview", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM traffic_rules
      ORDER BY pub_id ASC, id ASC
    `);

    return res.json(rows);

  } catch (err) {
    console.error("OVERVIEW ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   ADD RULE
   =========================================================== */
router.post("/rules", async (req, res) => {
  try {
    const b = req.body;

    const required = [
      "pub_id", "publisher_id", "publisher_name",
      "tracking_link_id", "offer_id", "offer_code",
      "offer_name", "advertiser_name",
      "geo", "carrier", "weight"
    ];

    for (const k of required) {
      if (!b[k]) return res.status(400).json({ error: `${k}_required` });
    }

    // Duplicate check
    const dup = await pool.query(
      `SELECT id FROM traffic_rules 
       WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3 AND status='active'`,
      [b.pub_id, b.tracking_link_id, b.offer_id]
    );

    if (dup.rows.length)
      return res.status(409).json({ error: "duplicate_offer_for_pub" });

    // Insert
    const insert = `
      INSERT INTO traffic_rules (
        pub_id, publisher_id, publisher_name,
        tracking_link_id, geo, carrier,
        offer_id, offer_code, offer_name, advertiser_name,
        redirect_url, type, weight, status,
        created_by, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',$14,NOW())
      RETURNING *
    `;

    const params = [
      b.pub_id, b.publisher_id, b.publisher_name,
      b.tracking_link_id, b.geo, b.carrier,
      b.offer_id, b.offer_code, b.offer_name, b.advertiser_name,
      b.redirect_url, b.type, b.weight,
      b.created_by || 1
    ];

    const { rows } = await pool.query(insert, params);
    return res.json(rows[0]);

  } catch (err) {
    console.error("ADD RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   UPDATE RULE
   =========================================================== */
router.put("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body;

    const fields = [
      "publisher_id", "publisher_name",
      "tracking_link_id", "geo", "carrier",
      "offer_id", "offer_code", "offer_name",
      "advertiser_name", "redirect_url",
      "type", "weight", "status"
    ];

    const set = [];
    const values = [];
    let i = 1;

    for (const f of fields) {
      if (b[f] !== undefined) {
        set.push(`${f}=$${i++}`);
        values.push(b[f]);
      }
    }

    if (!set.length)
      return res.status(400).json({ error: "nothing_to_update" });

    values.push(id);

    const q = `
      UPDATE traffic_rules
      SET ${set.join(", ")}, updated_at = NOW()
      WHERE id=$${values.length}
      RETURNING *
    `;

    const { rows } = await pool.query(q, values);
    return res.json(rows[0]);

  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   DELETE RULE (FIXED)
   =========================================================== */
router.delete("/rules/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM traffic_rules WHERE id=$1", [req.params.id]);
    return res.json({ success: true });

  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   CLICK ROTATION + CLICK LOG
   =========================================================== */
router.get("/click", fraudCheck, async (req, res) => {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.redirect("https://google.com");
    }

    const rules = await pool.query(
      `SELECT * FROM traffic_rules WHERE pub_id=$1 AND status='active'`,
      [pub_id]
    );

    if (!rules.rows.length) return res.redirect("https://google.com");

    const filtered = rules.rows.filter(r => {
      const g = (r.geo || "").toUpperCase().split(",").map(v => v.trim());
      const c = (r.carrier || "").toUpperCase().split(",").map(v => v.trim());
      return g.includes(geo.toUpperCase()) && c.includes(carrier.toUpperCase());
    });

    if (!filtered.length) return res.redirect("https://google.com");

    // INAPP no rotation
    if (filtered[0].type === "INAPP") {
      let url = filtered[0].redirect_url;
      if (click_id)
        url += (url.includes("?") ? "&" : "?") + `click_id=${click_id}`;
      return res.redirect(url);
    }

    // Weighted rotation
    let total = filtered.reduce((s, r) => s + Number(r.weight), 0);
    let r = Math.random() * total;
    let selected = filtered[0];

    for (const rule of filtered) {
      r -= Number(rule.weight);
      if (r <= 0) {
        selected = rule;
        break;
      }
    }

    /* CLICK LOG */
    try {
      await pool.query(
        `
        INSERT INTO analytics_clicks 
        (pub_id, offer_id, geo, carrier, ip, ua, referer, params)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
        [
          pub_id,
          selected.offer_id,
          geo,
          carrier,
          req.ip,
          req.headers["user-agent"],
          req.headers["referer"] || null,
          JSON.stringify(req.query)
        ]
      );
    } catch (err) {
      console.error("CLICK LOGGING ERROR:", err);
    }

    // Redirect
    let finalUrl = selected.redirect_url;
    if (click_id)
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `click_id=${click_id}`;

    return res.redirect(finalUrl);

  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://google.com");
  }
});

export default router;
