import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ==============================
   GET META → publisher + offers + tracking links
============================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) {
      return res.status(400).json({ error: "pub_id is required" });
    }

    // correct column = publisher_id
    const publisher = await pool.query(
      "SELECT * FROM publishers WHERE publisher_id = $1",
      [pub_id]
    );

    // correct table = publisher_tracking_links
    const trackingLinks = await pool.query(
      "SELECT * FROM publisher_tracking_links WHERE publisher_id = $1 ORDER BY id ASC",
      [pub_id]
    );

    const offers = await pool.query(
      "SELECT offer_id, name AS offer_name, advertiser_name FROM offers ORDER BY offer_id ASC"
    );

    return res.json({
      publisher: publisher.rows[0] || null,
      tracking_links: trackingLinks.rows,
      offers: offers.rows,
    });
  } catch (error) {
    console.error("META Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ==============================
   GET RULES BY PUB
============================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const result = await pool.query(
      `SELECT *
       FROM traffic_rules
       WHERE pub_id = $1
       ORDER BY id ASC`,
      [pub_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("RULES Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==============================
   GET REMAINING OFFERS (NOT IN RULES)
============================== */
router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const usedOffers = await pool.query(
      "SELECT offer_id FROM traffic_rules WHERE pub_id = $1",
      [pub_id]
    );

    const usedIds = usedOffers.rows.map((x) => x.offer_id);

    const remaining = await pool.query(
      `SELECT offer_id, name AS offer_name, advertiser_name
       FROM offers
       WHERE offer_id NOT IN (${usedIds.length ? usedIds.join(",") : "0"})
       ORDER BY offer_id ASC`
    );

    res.json(remaining.rows);
  } catch (error) {
    console.error("REMAINING Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==============================
   GET OFFERS FOR SELECT DROPDOWN
============================== */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const exclude = req.query.exclude;

    const offers = await pool.query(
      `SELECT offer_id, name AS offer_name, advertiser_name
       FROM offers
       WHERE offer_id != $1
       ORDER BY offer_id ASC`,
      [exclude]
    );

    res.json(offers.rows);
  } catch (error) {
    console.error("OFFERS Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==============================
   UPDATE RULE BY ID
============================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const id = req.params.id;
    const {
      pub_id,
      tracking_link_id,
      geo,
      carrier,
      offer_id,
      offer_name,
      advertiser_name,
      redirect_url,
      type,
      weight,
      status,
    } = req.body;

    const update = await pool.query(
      `UPDATE traffic_rules
       SET pub_id=$1, tracking_link_id=$2, geo=$3, carrier=$4,
           offer_id=$5, offer_name=$6, advertiser_name=$7,
           redirect_url=$8, type=$9, weight=$10, status=$11
       WHERE id = $12
       RETURNING *`,
      [
        pub_id,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status,
        id,
      ]
    );

    res.json(update.rows[0]);
  } catch (error) {
    console.error("UPDATE RULE Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==============================
   CREATE NEW RULE
============================== */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const {
      pub_id,
      publisher_name,
      tracking_link_id,
      geo,
      carrier,
      offer_id,
      offer_name,
      advertiser_name,
      redirect_url,
      type,
      weight,
      status,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO traffic_rules 
        (pub_id, publisher_name, tracking_link_id, geo, carrier, offer_id, offer_name, advertiser_name, redirect_url, type, weight, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        pub_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("CREATE RULE Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
