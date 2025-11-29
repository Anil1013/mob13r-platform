import express from "express";
import pool from "../db.js";

const router = express.Router();

/* -------------------------------------------------------------------
   GET META (publishers / tracking links / offers list)
------------------------------------------------------------------- */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const publishers = await pool.query(
      "SELECT pub_id, pub_name FROM publishers ORDER BY pub_id ASC"
    );

    const tracking = await pool.query(
      "SELECT id, pub_id, tracking_link, geo, carrier FROM tracking_links WHERE pub_id = $1",
      [pub_id]
    );

    const offers = await pool.query(
      "SELECT offer_code, offer_name, geo, carrier FROM offers ORDER BY offer_code ASC"
    );

    res.json({
      publishers: publishers.rows,
      tracking_links: tracking.rows,
      offers: offers.rows,
    });
  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -------------------------------------------------------------------
   GET OFFERS (with exclude)
------------------------------------------------------------------- */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    const offers = exclude
      ? await pool.query(
          "SELECT * FROM offers WHERE offer_code != $1 ORDER BY offer_code ASC",
          [exclude]
        )
      : await pool.query("SELECT * FROM offers ORDER BY offer_code ASC");

    res.json(offers.rows);
  } catch (e) {
    console.error("OFFERS ERROR:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -------------------------------------------------------------------
   GET RULES (for pub_id)
------------------------------------------------------------------- */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;
    const q = await pool.query(
      "SELECT * FROM traffic_rules WHERE pub_id = $1 ORDER BY id ASC",
      [pub_id]
    );
    res.json(q.rows);
  } catch (e) {
    console.error("RULES ERROR:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -------------------------------------------------------------------
   GET REMAINING PERCENTAGE
------------------------------------------------------------------- */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const q = await pool.query(
      `SELECT COALESCE(SUM(percentage), 0) AS used 
       FROM traffic_rules 
       WHERE pub_id = $1 AND tracking_link_id = $2`,
      [pub_id, tracking_link_id]
    );

    const used = Number(q.rows[0].used);
    const remaining = 100 - used;

    res.json({ remaining });
  } catch (err) {
    console.error("REMAINING % ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -------------------------------------------------------------------
   UPDATE RULE
------------------------------------------------------------------- */
router.put("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pub_id,
      tracking_link_id,
      offer_code,
      percentage,
      geo,
      carrier,
    } = req.body;

    const q = await pool.query(
      `UPDATE traffic_rules
       SET pub_id=$1, tracking_link_id=$2, offer_code=$3, percentage=$4, geo=$5, carrier=$6
       WHERE id=$7 RETURNING *`,
      [pub_id, tracking_link_id, offer_code, percentage, geo, carrier, id]
    );

    res.json(q.rows[0]);
  } catch (e) {
    console.error("UPDATE RULE ERROR:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -------------------------------------------------------------------
   DISTRIBUTION CLICK HANDLER
------------------------------------------------------------------- */
router.get("/click", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;

    const rules = await pool.query(
      `SELECT offer_code, percentage 
       FROM traffic_rules
       WHERE pub_id=$1 AND geo=$2 AND carrier=$3`,
      [pub_id, geo, carrier]
    );

    let list = rules.rows;

    if (list.length === 0) {
      const geoOnly = await pool.query(
        `SELECT offer_code, percentage FROM traffic_rules
         WHERE pub_id=$1 AND geo=$2`,
        [pub_id, geo]
      );
      list = geoOnly.rows;
    }

    if (list.length === 0) {
      const pubOnly = await pool.query(
        `SELECT offer_code, percentage FROM traffic_rules
         WHERE pub_id=$1`,
        [pub_id]
      );
      list = pubOnly.rows;
    }

    if (list.length === 0) {
      return res.status(404).json({ error: "No distribution rules found" });
    }

    let total = 0;
    const weighted = list.map((r) => {
      total += r.percentage;
      return { offer_code: r.offer_code, weight: total };
    });

    const rand = Math.random() * total;
    const selected = weighted.find((x) => rand <= x.weight);

    const offer = await pool.query(
      "SELECT url FROM offers WHERE offer_code=$1 LIMIT 1",
      [selected.offer_code]
    );

    if (offer.rows.length === 0) {
      return res.status(404).json({ error: "Offer not found" });
    }

    return res.redirect(offer.rows[0].url);
  } catch (e) {
    console.error("CLICK ERROR:", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
