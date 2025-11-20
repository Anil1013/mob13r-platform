// backend/routes/distribution.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
  Updated Features:
  ✓ /click auto-redirects safely
  ✓ INAPP flows bypass rotation (PIN SEND / PIN VERIFY remain untouched)
  ✓ CPA/CPI/CPL/CPS follow weighted rotation
  ✓ Global Overview API added
*/

/* ============================================================
   AUTO-REDIRECT HANDLER (SAFE FOR INAPP)
   ============================================================ */
router.get("/click", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.status(400).send("Missing params: pub_id, geo, carrier");
    }

    // Get rules
    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      AND status = 'active'
    `;
    const { rows } = await pool.query(q, [pub_id]);

    if (!rows.length) {
      console.log("NO RULES FOUND → Redirect Google");
      return res.redirect("https://google.com");
    }

    // Filter geo/carrier (supports multi CSV)
    const filtered = rows.filter(r => {
      const geos = (r.geo || "").split(",").map(v => v.trim().toUpperCase());
      const carriers = (r.carrier || "").split(",").map(v => v.trim().toUpperCase());
      return geos.includes(geo.toUpperCase()) && carriers.includes(carrier.toUpperCase());
    });

    if (!filtered.length) {
      console.log("NO MATCHED RULES → Google");
      return res.redirect("https://google.com");
    }

    // If INAPP → DO NOT ROTATE
    if (filtered[0].type === "INAPP") {
      console.log("INAPP DETECTED → NO ROTATION");
      return res.redirect(filtered[0].redirect_url);
    }

    // Weighted rotation for all other types
    let totalWeight = filtered.reduce((acc, r) => acc + Number(r.weight), 0);
    let random = Math.random() * totalWeight;

    for (const rule of filtered) {
      random -= Number(rule.weight);
      if (random <= 0) {
        console.log("ROTATED →", rule.redirect_url);
        return res.redirect(rule.redirect_url);
      }
    }

    // Final fallback
    return res.redirect(filtered[0].redirect_url);

  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://google.com");
  }
});

/* ============================================================
   META → Load publisher tracking
   ============================================================ */
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
    res.json(rows);

  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   OFFERS LIST
   ============================================================ */
router.get("/offers", async (req, res) => {
  try {
    const { geo, carrier, exclude } = req.query;

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
      const ex = exclude.split(",").map(v => Number(v));
      const placeholders = ex.map((_, i) => `$${i + 1}`).join(",");
      q += ` AND id NOT IN (${placeholders})`;
      params.push(...ex);
    }

    q += " ORDER BY id ASC";
    const { rows } = await pool.query(q, params);
    res.json(rows);

  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   RULES LIST
   ============================================================ */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
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
    const sumw = Number(rows[0]?.sumw);
    res.json({ sum: sumw, remaining: 100 - sumw });

  } catch (err) {
    console.error("REMAINING ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   GLOBAL OVERVIEW
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
      "weight"
    ];

    for (const k of required) {
      if (!b[k]) return res.status(400).json({ error: `${k}_required` });
    }

    const dup = await pool.query(
      `SELECT id FROM traffic_rules
       WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3 AND status='active'`,
      [b.pub_id, b.tracking_link_id, b.offer_id]
    );

    if (dup.rows.length)
      return res.status(409).json({ error: "duplicate_offer_for_pub" });

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

    if (!set.length) return res.status(400).json({ error: "nothing_to_update" });

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
    await pool.query("DELETE FROM traffic_rules WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
