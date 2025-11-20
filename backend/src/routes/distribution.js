import express from "express";
import pool from "../db.js";

const router = express.Router();

/* -----------------------------------------------------------
   GET META (publisher combos + tracking link info)
   /api/distribution/meta?pub_id=PUB03
------------------------------------------------------------*/
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id)
      return res.status(400).json({ error: "pub_id_required" });

    const q = `
      SELECT 
        id AS tracking_link_id,
        pub_code,
        publisher_id,
        publisher_name,
        geo,
        carrier,
        type
      FROM publisher_tracking_links
      WHERE pub_code = $1
        AND status = 'active'
      ORDER BY id ASC
    `;

    const result = await pool.query(q, [pub_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* -----------------------------------------------------------
   GET OFFERS (all active offers)
   /api/distribution/offers
------------------------------------------------------------*/
router.get("/offers", async (req, res) => {
  try {
    const q = `
      SELECT 
        id,
        offer_id,
        name AS offer_name,
        advertiser_name,
        type,
        payout,
        tracking_url
      FROM offers
      WHERE status = 'active'
      ORDER BY id ASC
    `;

    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* -----------------------------------------------------------
   GET ACTIVE RULES FOR A PUB_ID
   /api/distribution/rules?pub_id=PUB03
------------------------------------------------------------*/
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY id ASC
    `;

    const result = await pool.query(q, [pub_id]);
    res.json(result.rows);
  } catch (err) {
    console.error("RULES FETCH ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* -----------------------------------------------------------
   ADD NEW DISTRIBUTION RULE
   /api/distribution/rules  (POST)
------------------------------------------------------------*/
router.post("/rules", async (req, res) => {
  try {
    const {
      pub_id,
      publisher_id,
      publisher_name,

      tracking_link_id,
      geo,
      carrier,

      offer_id,
      offer_code,
      offer_name,
      advertiser_name,

      redirect_url,
      type,
      weight,

      created_by
    } = req.body;

    const q = `
      INSERT INTO traffic_rules (
        pub_id, publisher_id, publisher_name,
        tracking_link_id, geo, carrier,
        offer_id, offer_code, offer_name, advertiser_name,
        redirect_url, type, weight, created_by
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `;

    const result = await pool.query(q, [
      pub_id,
      publisher_id,
      publisher_name,

      tracking_link_id,
      geo,
      carrier,

      offer_id,
      offer_code,
      offer_name,
      advertiser_name,

      redirect_url,
      type,
      weight,
      created_by || 1
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("ADD RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* -----------------------------------------------------------
   DELETE RULE
   /api/distribution/rules/:id
------------------------------------------------------------*/
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

/* -----------------------------------------------------------
   CLICK ROTATION — Weight Based Redirect
   Called by:
   https://backend.mob13r.com/click?pub_id=PUB03&geo=BD&carrier=Robi
------------------------------------------------------------*/
router.get("/click", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;

    const q = `
      SELECT redirect_url, weight
      FROM traffic_rules
      WHERE pub_id = $1
        AND geo = $2
        AND carrier = $3
        AND status = 'active'
    `;

    const result = await pool.query(q, [pub_id, geo, carrier]);

    if (result.rows.length === 0)
      return res.redirect("https://google.com");

    const rules = result.rows;

    // Weighted random selection
    let total = rules.reduce((sum, r) => sum + r.weight, 0);
    let rand = Math.random() * total;

    for (let r of rules) {
      if ((rand -= r.weight) < 0) {
        return res.redirect(r.redirect_url);
      }
    }

    res.redirect("https://google.com");
  } catch (err) {
    console.error("CLICK ROTATION ERROR:", err);
    res.redirect("https://google.com");
  }
});

export default router;
