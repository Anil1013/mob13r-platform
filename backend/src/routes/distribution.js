import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ------------------------------------------
   1. GET TRACKING LINKS FOR PUBLISHER
-------------------------------------------*/
router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const result = await pool.query(
      `SELECT * FROM tracking_links WHERE pub_id = $1`,
      [pub_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tracking links:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/* ------------------------------------------
   2. GET RULES FOR SELECTED TRACKING LINK
-------------------------------------------*/
router.get("/rules/:pub_id/:tracking_link_id", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM distribution_rules 
       WHERE pub_id = $1 AND tracking_link_id = $2
       ORDER BY priority ASC`,
      [pub_id, tracking_link_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching rules:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/* ------------------------------------------
   3. GET REMAINING OFFERS
-------------------------------------------*/
router.get("/offers/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const result = await pool.query(
      `SELECT * FROM offers 
       WHERE offer_id NOT IN (
            SELECT offer_id FROM distribution_rules
            WHERE pub_id = $1 AND tracking_link_id = $2
       )`,
      [pub_id, tracking_link_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching remaining offers:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
