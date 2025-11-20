// backend/routes/distribution.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
  Routes:
  GET  /meta?pub_id=PUB01
  GET  /offers?geo=XX&carrier=YYY&exclude=1,2,3
  GET  /rules?pub_id=PUB01
  GET  /rules/remaining?pub_id=PUB01&tracking_link_id=5
  GET  /overview
  POST /rules
  PUT  /rules/:id
  DELETE /rules/:id
  GET  /click?pub_id=...&geo=...&carrier=...
*/

// ====== META: return publisher tracking links for a pub_code ======
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

// ====== OFFERS: active offers optionally filtered & excluding IDs ======
router.get("/offers", async (req, res) => {
  try {
    const { geo, carrier, exclude } = req.query;

    // Basic fetch of active offers. If you want geo-specific offers later, extend with joins/metadata.
    let q = `
      SELECT 
        id,
        offer_id,
        name as offer_name,
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
      const ids = exclude.split(",").map((s) => Number(s)).filter(Boolean);
      if (ids.length) {
        const placeholders = ids.map((_, i) => `$${params.length + i + 1}`).join(",");
        q += ` AND id NOT IN (${placeholders})`;
        params.push(...ids);
      }
    }

    q += " ORDER BY id ASC";
    const { rows } = await pool.query(q, params);
    // optional client-side filtering by geo/carrier if you want geo-aware offers
    let filtered = rows;
    if (geo || carrier) {
      const G = (geo || "").toUpperCase();
      const C = (carrier || "").toUpperCase();
      // currently offers table doesn't have geo/carrier columns — keep it generic
      // if you store target geos/carriers on offers, filter here
      // For now, just return all active (server doesn't filter)
      // filtered = rows.filter(...);
    }
    res.json(filtered);
  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== RULES: list rules for a pub_id ======
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
    console.error("RULES FETCH ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== REMAINING: remaining percentage for pub_id (optionally for a specific tracking_link_id) ======
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    let q = `SELECT COALESCE(SUM(weight),0) AS sumw FROM traffic_rules WHERE pub_id = $1 AND status='active'`;
    const params = [pub_id];
    if (tracking_link_id) {
      params.push(tracking_link_id);
      q = `SELECT COALESCE(SUM(weight),0) AS sumw FROM traffic_rules WHERE pub_id = $1 AND tracking_link_id = $2 AND status='active'`;
    }
    const { rows } = await pool.query(q, params);
    const sumw = Number(rows[0]?.sumw || 0);
    const remaining = Math.max(0, 100 - sumw);
    res.json({ sum: sumw, remaining });
  } catch (err) {
    console.error("REMAINING ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== OVERVIEW: returns all PUB_ID + Offer mapping (global) ======
router.get("/overview", async (req, res) => {
  try {
    const q = `
      SELECT
        tr.id,
        tr.pub_id,
        tr.publisher_id,
        tr.publisher_name,
        tr.offer_id,
        tr.offer_code,
        tr.offer_name,
        tr.advertiser_name,
        tr.tracking_link_id,
        tr.geo,
        tr.carrier,
        tr.weight,
        tr.redirect_url,
        tr.type,
        tr.status,
        tr.created_at
      FROM traffic_rules tr
      ORDER BY tr.pub_id ASC, tr.id ASC
    `;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (err) {
    console.error("OVERVIEW ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== POST: add rule (prevent duplicate for same pub + tracking_link + offer) ======
router.post("/rules", async (req, res) => {
  try {
    const body = req.body;
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
    for (const k of required) {
      if (!body[k] && body[k] !== 0) return res.status(400).json({ error: `${k}_required` });
    }

    // Prevent duplicate: same pub + tracking_link + offer
    const dupQ = `
      SELECT id FROM traffic_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
        AND offer_id = $3
        AND status = 'active'
    `;
    const dupRes = await pool.query(dupQ, [body.pub_id, body.tracking_link_id, body.offer_id]);
    if (dupRes.rows.length) {
      return res.status(409).json({ error: "duplicate_offer_for_pub" });
    }

    const q = `
      INSERT INTO traffic_rules (
        pub_id, publisher_id, publisher_name,
        tracking_link_id, geo, carrier,
        offer_id, offer_code, offer_name, advertiser_name,
        redirect_url, type, weight, status, created_by, created_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, NOW()
      ) RETURNING *
    `;
    const params = [
      body.pub_id,
      body.publisher_id,
      body.publisher_name,
      body.tracking_link_id,
      body.geo,
      body.carrier,
      body.offer_id,
      body.offer_code,
      body.offer_name,
      body.advertiser_name,
      body.redirect_url || null,
      body.type || null,
      Number(body.weight) || 0,
      body.status || "active",
      body.created_by || 1,
    ];
    const { rows } = await pool.query(q, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("ADD RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== PUT: update a rule (prevent duplicates on change) ======
router.put("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;

    if (body.offer_id) {
      const dupQ = `
        SELECT id FROM traffic_rules
        WHERE pub_id = $1
          AND tracking_link_id = $2
          AND offer_id = $3
          AND id != $4
          AND status='active'
      `;
      const dupRes = await pool.query(dupQ, [body.pub_id, body.tracking_link_id, body.offer_id, id]);
      if (dupRes.rows.length) return res.status(409).json({ error: "duplicate_offer_for_pub" });
    }

    const setParts = [];
    const params = [];
    let idx = 1;
    for (const key of [
      "publisher_id",
      "publisher_name",
      "tracking_link_id",
      "geo",
      "carrier",
      "offer_id",
      "offer_code",
      "offer_name",
      "advertiser_name",
      "redirect_url",
      "type",
      "weight",
      "status",
    ]) {
      if (key in body) {
        setParts.push(`${key} = $${idx++}`);
        params.push(body[key]);
      }
    }
    if (!setParts.length) return res.status(400).json({ error: "nothing_to_update" });
    params.push(id);
    const q = `UPDATE traffic_rules SET ${setParts.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(q, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== DELETE rule ======
router.delete("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("DELETE FROM traffic_rules WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ====== CLICK ROTATION: pick redirect_url using weights (supports multi-geo/carrier CSV in db) ======
router.get("/click", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;
    if (!pub_id || !geo || !carrier) {
      return res.status(400).send("missing params");
    }

    const q = `SELECT redirect_url, weight, geo, carrier FROM traffic_rules WHERE pub_id = $1 AND status='active'`;
    const { rows } = await pool.query(q, [pub_id]);
    if (!rows.length) return res.redirect("https://google.com");

    const filtered = rows.filter((r) => {
      const geos = (r.geo || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      const carriers = (r.carrier || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      return (geos.length === 0 || geos.includes(geo.toUpperCase())) &&
             (carriers.length === 0 || carriers.includes(carrier.toUpperCase()));
    });

    if (!filtered.length) return res.redirect("https://google.com");

    let total = filtered.reduce((s, item) => s + Number(item.weight || 0), 0);
    if (total <= 0) return res.redirect(filtered[0].redirect_url || "https://google.com");

    let r = Math.random() * total;
    for (const item of filtered) {
      r -= Number(item.weight);
      if (r <= 0) return res.redirect(item.redirect_url);
    }

    res.redirect(filtered[0].redirect_url || "https://google.com");
  } catch (err) {
    console.error("CLICK ROTATE ERROR:", err);
    res.status(500).redirect("https://google.com");
  }
});

export default router;
