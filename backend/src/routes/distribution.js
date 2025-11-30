// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ===========================================================
   🔥 1) GET ALL DATA (merged rules + offers + tracking + fallback-ready)
      /api/distribution/complete?pub_id=PUB03
=========================================================== */
router.get("/complete", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) return res.status(400).json({ success: false, message: "pub_id required" });

    /* 1) Publisher */
    const pub = await pool.query(
      `SELECT publisher_name FROM publishers WHERE pub_id = $1`,
      [pub_id]
    );
    const publisher_name = pub.rows[0]?.publisher_name || "";

    /* 2) Tracking links */
    const tracking = await pool.query(
      `SELECT id AS tracking_link_id, tracking_id, url AS base_url
       FROM publisher_tracking_links 
       WHERE publisher_id = $1`,
      [pub_id]
    );

    /* 3) Rules */
    const rules = await pool.query(
      `SELECT * 
       FROM distribution_rules 
       WHERE pub_id = $1
       ORDER BY tracking_link_id, weight DESC`,
      [pub_id]
    );

    /* 4) Offers */
    const offers = await pool.query(
      `SELECT offer_id, offer_name, advertiser_name, geo, carrier, cap, status 
       FROM offers`
    );

    const offerMap = {};
    offers.rows.forEach((o) => (offerMap[o.offer_id] = o));

    /* ========== MERGE EVERYTHING ========== */
    const final = [];

    for (const t of tracking.rows) {
      const r = rules.rows.filter((x) => x.tracking_link_id === t.tracking_link_id);

      const processed = r.map((x) => {
        const o = offerMap[x.offer_id] || {};

        return {
          pub_id,
          publisher_name,

          tracking_link_id: t.tracking_link_id,
          tracking_id: t.tracking_id,

          geo: o.geo || "",
          carrier: o.carrier || "",
          offer_id: o.offer_id || "",
          offer_name: o.offer_name || "",
          advertiser_name: o.advertiser_name || "",
          cap: o.cap || 0,
          status: o.status || "",

          weight: x.weight,

          tracking_url:
            `${t.base_url}?pub_id=${pub_id}` +
            `&geo=${o.geo}&carrier=${o.carrier}` +
            `&click_id={click_id}&ua={ua}&msisdn={msisdn}`
        };
      });

      final.push({
        tracking_link_id: t.tracking_link_id,
        tracking_id: t.tracking_id,
        rules: processed
      });
    }

    return res.json({
      success: true,
      publisher_name,
      data: final
    });

  } catch (error) {
    console.error("COMPLETE API ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ===========================================================
   🔥 2) Fallback OR Main Offer Selector (CLICK ENGINE)
      backend.mob13r.com/click?pub_id=PUB03&geo=BD&carrier=Robi
=========================================================== */
router.get("/select-offer", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;

    const rules = await pool.query(
      `SELECT dr.*, o.geo, o.carrier, o.cap, o.offer_name, o.advertiser_name
       FROM distribution_rules dr
       JOIN offers o ON o.offer_id = dr.offer_id
       WHERE dr.pub_id = $1 AND o.geo = $2 AND o.carrier = $3
       ORDER BY dr.weight DESC`,
      [pub_id, geo, carrier]
    );

    if (rules.rows.length === 0) {
      return res.json({ success: true, message: "NO_RULES_AVAILABLE" });
    }

    /* 🔥 CAP CHECK + FALLBACK HANDLING */
    let activeOffers = [];

    for (const r of rules.rows) {
      const capData = await pool.query(
        `SELECT total_hits FROM offer_caps WHERE offer_id = $1`,
        [r.offer_id]
      );

      const used = capData.rows[0]?.total_hits || 0;

      if (used < r.cap) {
        activeOffers.push(r); // under cap → allowed
      }
    }

    // If NO offer under cap → fallback to highest weight offer
    if (activeOffers.length === 0) {
      activeOffers = rules.rows;
    }

    /* 🔥 WEIGHTED RANDOM SELECTION */
    const totalWeight = activeOffers.reduce((acc, r) => acc + r.weight, 0);
    const random = Math.random() * totalWeight;

    let cumulative = 0;
    let selected = activeOffers[0];

    for (const r of activeOffers) {
      cumulative += r.weight;
      if (random <= cumulative) {
        selected = r;
        break;
      }
    }

    res.json({ success: true, selected });

  } catch (error) {
    console.log("SELECT ERROR:", error);
    res.status(500).json({ success: false });
  }
});

/* ===========================================================
   🔥 3) CRUD — META
=========================================================== */
router.get("/meta", authJWT, async (req, res) => {
  const { pub_id } = req.query;
  const result = await pool.query(
    `SELECT * FROM distribution_meta WHERE pub_id=$1`,
    [pub_id]
  );
  res.json({ success: true, meta: result.rows });
});

router.post("/meta", authJWT, async (req, res) => {
  const { pub_id, tracking_link_id, total_hit, remaining_hit } = req.body;

  const result = await pool.query(
    `INSERT INTO distribution_meta 
     (pub_id, tracking_link_id, total_hit, remaining_hit)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [pub_id, tracking_link_id, total_hit, remaining_hit]
  );

  res.json({ success: true, meta: result.rows[0] });
});

/* ===========================================================
   🔥 4) CRUD — RULES
=========================================================== */
router.get("/rules", authJWT, async (req, res) => {
  const { pub_id, tracking_link_id } = req.query;

  const result = await pool.query(
    `SELECT * 
     FROM distribution_rules 
     WHERE pub_id=$1 AND tracking_link_id=$2
     ORDER BY weight DESC`,
    [pub_id, tracking_link_id]
  );

  res.json({ success: true, rules: result.rows });
});

router.post("/rules", authJWT, async (req, res) => {
  const { pub_id, tracking_link_id, offer_id, weight } = req.body;

  const result = await pool.query(
    `INSERT INTO distribution_rules 
     (pub_id, tracking_link_id, offer_id, weight)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [pub_id, tracking_link_id, offer_id, weight]
  );

  res.json({ success: true, rule: result.rows[0] });
});

router.put("/rules/:id", authJWT, async (req, res) => {
  const { offer_id, weight } = req.body;
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE distribution_rules
     SET offer_id=$1, weight=$2
     WHERE id=$3
     RETURNING *`,
    [offer_id, weight, id]
  );

  res.json({ success: true, rule: result.rows[0] });
});

router.delete("/rules/:id", authJWT, async (req, res) => {
  await pool.query(`DELETE FROM distribution_rules WHERE id=$1`, [
    req.params.id,
  ]);

  res.json({ success: true });
});

/* ===========================================================
   🔥 5) WEIGHT CHECK
=========================================================== */
router.get("/remaining-weight", authJWT, async (req, res) => {
  const { pub_id, tracking_link_id } = req.query;

  const result = await pool.query(
    `SELECT COALESCE(SUM(weight),0) AS used
     FROM distribution_rules
     WHERE pub_id=$1 AND tracking_link_id=$2`,
    [pub_id, tracking_link_id]
  );

  const used = parseInt(result.rows[0].used);
  const remaining = 100 - used;

  res.json({ success: true, used, remaining });
});

export default router;
