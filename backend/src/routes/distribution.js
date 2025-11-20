import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";   // ✅ ADDED

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
    res.json(rows);
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

// ====== REMAINING % ======
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

// ====== OVERVIEW (GLOBAL) ======
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

// ====== ADD RULE ======
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

// ====== UPDATE RULE ======
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

    const q = `
      UPDATE traffic_rules 
      SET ${setParts.join(", ")}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING *
    `;

    const { rows } = await pool.query(q, params);
    res.json(rows[0]);

  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

// ============================================================
//  CLICK ROTATION + FRAUD CHECK (ADDED)
// ============================================================
router.get("/click", fraudCheck, async (req, res) => {   // ✅ fraudCheck added
  try {
    const { pub_id, geo, carrier } = req.query;
    if (!pub_id || !geo || !carrier) {
      return res.status(400).send("missing params");
    }

    const q = `
      SELECT redirect_url, weight, geo, carrier 
      FROM traffic_rules 
      WHERE pub_id = $1 AND status='active'
    `;

    const { rows } = await pool.query(q, [pub_id]);
    if (!rows.length) return res.redirect("https://google.com");

    const filtered = rows.filter((r) => {
      const geos = (r.geo || "").split(",").map(s => s.trim().toUpperCase());
      const carriers = (r.carrier || "").split(",").map(s => s.trim().toUpperCase());
      return geos.includes(geo.toUpperCase()) && carriers.includes(carrier.toUpperCase());
    });

    if (!filtered.length) return res.redirect("https://google.com");

    let total = filtered.reduce((s, item) => s + Number(item.weight), 0);
    let random = Math.random() * total;

    for (const item of filtered) {
      random -= Number(item.weight);
      if (random <= 0) return res.redirect(item.redirect_url);
    }

    return res.redirect(filtered[0].redirect_url);

  } catch (err) {
    console.error("CLICK ROTATE ERROR:", err);
    res.status(500).redirect("https://google.com");
  }
});

export default router;
