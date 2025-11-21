// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/* ============================================================
   CLICK HANDLER (with fraudCheck)
============================================================ */
router.get("/click", fraudCheck, async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.redirect("https://google.com");
    }

    const rules = await pool.query(
      `SELECT * FROM traffic_rules WHERE pub_id=$1 AND status='active'`,
      [pub_id]
    );

    if (!rules.rows.length) return res.redirect("https://google.com");

    // Filter by geo/carrier
    const filtered = rules.rows.filter(r => {
      const g = (r.geo || "").toUpperCase().split(",").map(s => s.trim());
      const c = (r.carrier || "").toUpperCase().split(",").map(s => s.trim());
      return g.includes(geo.toUpperCase()) && c.includes(carrier.toUpperCase());
    });

    if (!filtered.length) return res.redirect("https://google.com");

    // If type is INAPP → no rotation
    if (filtered[0].type === "INAPP") {
      return res.redirect(filtered[0].redirect_url);
    }

    // Weighted rotation
    let total = filtered.reduce((s, r) => s + Number(r.weight), 0);
    let r = Math.random() * total;

    for (const rule of filtered) {
      r -= Number(rule.weight);
      if (r <= 0) return res.redirect(rule.redirect_url);
    }

    return res.redirect(filtered[0].redirect_url);

  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://google.com");
  }
});

/* ============================================================
   META (publisher tracking links)
============================================================ */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

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
      WHERE pub_code=$1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);

  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   OFFERS
============================================================ */
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
      WHERE status='active'
    `;

    const params = [];

    if (exclude) {
      const ids = exclude.split(",").map(Number);
      q += ` AND id NOT IN (${ids.map((_, i) => "$" + (i + 1)).join(",")})`;
      params.push(...ids);
    }

    const { rows } = await pool.query(q, params);
    res.json(rows);

  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   RULES
============================================================ */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id=$1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);

  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   REMAINING %
============================================================ */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    let q = `
      SELECT COALESCE(SUM(weight),0) AS sumw
      FROM traffic_rules
      WHERE pub_id=$1 AND status='active'
    `;
    const params = [pub_id];

    if (tracking_link_id) {
      q = `
        SELECT COALESCE(SUM(weight),0) AS sumw
        FROM traffic_rules
        WHERE pub_id=$1 AND tracking_link_id=$2 AND status='active'
      `;
      params.push(tracking_link_id);
    }

    const { rows } = await pool.query(q, params);
    res.json({
      sum: rows[0].sumw,
      remaining: 100 - rows[0].sumw
    });

  } catch (err) {
    console.error("REMAINING ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   GLOBAL OVERVIEW  (FIX FOR 404)
   ============================================================ */
router.get("/overview", async (req, res) => {
  try {
    const q = `
      SELECT *
      FROM traffic_rules
      ORDER BY pub_id ASC, id ASC
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("OVERVIEW ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});


/* ============================================================
   ADD RULE
============================================================ */
router.post("/rules", async (req, res) => {
  try {
    const b = req.body;

    const required = [
      "pub_id",
      "publisher_id",
      "publisher_name",
      "tracking_link_id",
      "offer_id",
      "offer_code",
      "offer_name",
      "advertiser_name",
      "geo",
      "carrier",
      "weight",
    ];

    for (const r of required) {
      if (!b[r]) return res.status(400).json({ error: `${r}_required` });
    }

    // Duplicate check
    const dup = await pool.query(
      `SELECT id FROM traffic_rules 
       WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3 AND status='active'`,
      [b.pub_id, b.tracking_link_id, b.offer_id]
    );

    if (dup.rows.length) return res.status(409).json({ error: "duplicate_offer_for_pub" });

    const insert = `
      INSERT INTO traffic_rules (
        pub_id, publisher_id, publisher_name,
        tracking_link_id, geo, carrier,
        offer_id, offer_code, offer_name, advertiser_name,
        redirect_url, type, weight, status, created_by, created_at
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
    res.json(rows[0]);

  } catch (err) {
    console.error("ADD RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   UPDATE RULE
============================================================ */
router.put("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body;

    const fields = [
      "publisher_id", "publisher_name", "tracking_link_id",
      "geo", "carrier", "offer_id", "offer_code", "offer_name",
      "advertiser_name", "redirect_url", "type", "weight", "status"
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

    values.push(id);

    const q = `
      UPDATE traffic_rules 
      SET ${set.join(", ")}, updated_at = NOW()
      WHERE id=$${values.length}
      RETURNING *
    `;

    const { rows } = await pool.query(q, values);
    res.json(rows[0]);

  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   DELETE RULE
============================================================ */
router.delete("/rules/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM traffic_rules WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
