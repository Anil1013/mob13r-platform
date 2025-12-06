import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";   // <<--- FIXED

const router = express.Router();

/* ----------------------------------------------------
   GET TRACKING LINKS FOR PUBLISHER (by pub_code)
---------------------------------------------------- */
router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query; // PUB03

    const query = `
      SELECT id, pub_code, name, geo, carrier, landing_page_url, tracking_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;

    const result = await pool.query(query, [pub_id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tracking links:", err);
    res.status(500).json({ error: "Failed to fetch tracking links" });
  }
});

/* ----------------------------------------------------
   GET DISTRIBUTION RULES FOR A TRACKING LINK
---------------------------------------------------- */
router.get("/rules/:pub_code/:tracking_link_id", authJWT, async (req, res) => {
  try {
    const { pub_code, tracking_link_id } = req.params;

    const query = `
      SELECT *
      FROM distribution_rules
      WHERE pub_code = $1 AND tracking_link_id = $2
      ORDER BY priority ASC
    `;

    const result = await pool.query(query, [pub_code, tracking_link_id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching rules:", err);
    res.status(500).json({ error: "Failed to fetch rules" });
  }
});

/* ----------------------------------------------------
   GET OFFERS THAT ARE NOT USED IN THIS TRACKING LINK
---------------------------------------------------- */
router.get("/offers/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const query = `
      SELECT o.*
      FROM offers o
      WHERE o.id NOT IN (
        SELECT offer_id
        FROM distribution_rules
        WHERE pub_code = $1 AND tracking_link_id = $2
      )
      ORDER BY o.id ASC
    `;

    const result = await pool.query(query, [pub_id, tracking_link_id]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching remaining offers:", err);
    res.status(500).json({ error: "Failed to fetch remaining offers" });
  }
});

/* ----------------------------------------------------
   ADD NEW DISTRIBUTION RULE
---------------------------------------------------- */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const {
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      priority,
      weight,
      fallback,
    } = req.body;

    const insertQuery = `
      INSERT INTO distribution_rules 
      (pub_code, tracking_link_id, offer_id, geo, carrier, device, priority, weight, fallback)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      pub_code,
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      device,
      priority,
      weight,
      fallback,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error creating rule:", err);
    res.status(500).json({ error: "Failed to create rule" });
  }
});

export default router;
