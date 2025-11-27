// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/*
  ===========================================================
  TRAFFIC DISTRIBUTION + CLICK LOGGING
  ===========================================================
  • META (tracking links)
  • OFFERS
  • RULES
  • CLICK ROTATION
  • CLICK LOG INSERT → analytics_clicks
  ===========================================================
*/

/* ===========================================================
   META  → Load Publisher Tracking Links
   =========================================================== */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const q = `
      SELECT id AS tracking_link_id, pub_code, publisher_id, publisher_name,
             geo, carrier, type, tracking_url, status
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

/* ===========================================================
   ACTIVE OFFERS
   =========================================================== */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    let q = `
      SELECT id, offer_id, name AS offer_name, advertiser_name, type,
             payout, tracking_url, status
      FROM offers
      WHERE status = 'active'
    `;

    const params = [];

    if (exclude) {
      const ids = exclude.split(",").map(Number).filter(Boolean);
      if (ids.length) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
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

/* ===========================================================
   RULES LIST
   =========================================================== */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const q = `SELECT * FROM traffic_rules WHERE pub_id = $1 ORDER BY id ASC`;
    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);

  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   GLOBAL OVERVIEW
   =========================================================== */
router.get("/overview", async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM traffic_rules ORDER BY pub_id ASC, id ASC`);
    res.json(rows);

  } catch (err) {
    console.error("OVERVIEW ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   CLICK ROTATION + CLICK LOGGING
   =========================================================== */
router.get("/click", fraudCheck, async (req, res) => {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.status(400).send("missing params");
    }

    // Fetch rules
    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1 AND status = 'active'
    `;
    const { rows } = await pool.query(q, [pub_id]);

    if (!rows.length) return res.redirect("https://google.com");

    const filtered = rows.filter((r) => {
      const geos = (r.geo || "").split(",").map(v => v.trim().toUpperCase());
      const carriers = (r.carrier || "").split(",").map(v => v.trim().toUpperCase());

      return geos.includes(geo.toUpperCase()) &&
             carriers.includes(carrier.toUpperCase());
    });

    if (!filtered.length) return res.redirect("https://google.com");

    let selected = filtered[0];

    // ROTATION
    let total = filtered.reduce((a, r) => a + Number(r.weight), 0);
    let rnd = Math.random() * total;

    for (const rule of filtered) {
      rnd -= Number(rule.weight);
      if (rnd <= 0) {
        selected = rule;
        break;
      }
    }

    /* ======================================================
       LOG CLICK INTO analytics_clicks TABLE
       ====================================================== */
    try {
      await pool.query(
        `INSERT INTO analytics_clicks 
         (pub_id, offer_id, geo, carrier, ip, ua, referer, params)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          pub_id,
          selected.offer_id,
          geo,
          carrier,
          req.ip,
          req.headers["user-agent"],
          req.headers["referer"] || null,
          req.query ? JSON.stringify(req.query) : null,
        ]
      );
    } catch (err) {
      console.error("CLICK LOGGING ERROR:", err);
    }

    /* ======================================================
       REDIRECT WITH CLICK_ID
       ====================================================== */
    let finalUrl = selected.redirect_url;

    if (click_id) {
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `click_id=${click_id}`;
    }

    return res.redirect(finalUrl);

  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://google.com");
  }
});

/* ===========================================================
   DELETE TRAFFIC RULE
   DELETE /distribution/rules/:id
   =========================================================== */
router.delete("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "rule_id_required" });

    const q = `DELETE FROM traffic_rules WHERE id = $1 RETURNING id`;
    const { rows } = await pool.query(q, [id]);

    if (!rows.length) {
      return res.status(404).json({ error: "rule_not_found" });
    }

    res.json({ success: true, deleted_id: rows[0].id });

  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});


export default router;
