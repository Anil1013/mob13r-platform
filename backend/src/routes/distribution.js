// backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";   // ← JWT middleware added

const router = express.Router();

/* ===========================================================
   1️⃣  GET META (JWT Protected)
=========================================================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ success: false, message: "pub_id is required" });
    }

    const meta = await pool.query(
      `SELECT *
       FROM distribution_meta
       WHERE pub_id = $1
       ORDER BY tracking_link_id ASC`,
      [pub_id]
    );

    return res.json({ success: true, meta: meta.rows });

  } catch (error) {
    console.error("META ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


/* ===========================================================
   2️⃣  GET RULES (JWT Protected)
=========================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const rules = await pool.query(
      `SELECT *
       FROM distribution_rules
       WHERE pub_id = $1 AND tracking_link_id = $2
       ORDER BY weight DESC`,
      [pub_id, tracking_link_id]
    );

    return res.json({ success: true, rules: rules.rows });

  } catch (error) {
    console.error("RULES ERROR:", error);
    res.status(500).json({ success: false });
  }
});


/* ===========================================================
   3️⃣  ADD META (JWT Protected)
=========================================================== */
router.post("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id, total_hit, remaining_hit } = req.body;

    const insert = await pool.query(
      `INSERT INTO distribution_meta 
       (pub_id, tracking_link_id, total_hit, remaining_hit)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pub_id, tracking_link_id, total_hit, remaining_hit]
    );

    res.json({ success: true, meta: insert.rows[0] });

  } catch (error) {
    console.error("META INSERT ERROR:", error);
    res.status(500).json({ success: false });
  }
});


/* ===========================================================
   4️⃣  ADD RULE (JWT Protected)
=========================================================== */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id, offer_id, weight } = req.body;

    const insert = await pool.query(
      `INSERT INTO distribution_rules
       (pub_id, tracking_link_id, offer_id, weight)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pub_id, tracking_link_id, offer_id, weight]
    );

    res.json({ success: true, rule: insert.rows[0] });

  } catch (error) {
    console.error("RULE INSERT ERROR:", error);
    res.status(500).json({ success: false });
  }
});


/* ===========================================================
   5️⃣  UPDATE RULE (JWT Protected)
=========================================================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { weight, offer_id } = req.body;

    const update = await pool.query(
      `UPDATE distribution_rules
       SET offer_id = $1, weight = $2
       WHERE id = $3
       RETURNING *`,
      [offer_id, weight, id]
    );

    res.json({ success: true, rule: update.rows[0] });

  } catch (error) {
    console.error("RULE UPDATE ERROR:", error);
    res.status(500).json({ success: false });
  }
});


/* ===========================================================
   6️⃣  DELETE RULE (JWT Protected)
=========================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM distribution_rules WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });

  } catch (error) {
    console.error("RULE DELETE ERROR:", error);
    res.status(500).json({ success: false });
  }
});


/* ===========================================================
   7️⃣  REMAINING WEIGHT (JWT Protected)
=========================================================== */
router.get("/remaining-weight", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const sum = await pool.query(
      `SELECT COALESCE(SUM(weight), 0) AS used
       FROM distribution_rules
       WHERE pub_id = $1 AND tracking_link_id = $2`,
      [pub_id, tracking_link_id]
    );

    const used = parseInt(sum.rows[0].used);
    const remaining = 100 - used;

    res.json({ success: true, used, remaining });

  } catch (error) {
    console.error("WEIGHT CHECK ERROR:", error);
    res.status(500).json({ success: false });
  }
});


/* ===========================================================
   8️⃣  OFFERS LIST (JWT Protected)
=========================================================== */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const offers = await pool.query(
      `SELECT offer_id, advertiser_name, offer_name, cap 
       FROM offers
       WHERE status = 'active'`
    );

    res.json({ success: true, offers: offers.rows });

  } catch (error) {
    console.error("OFFERS ERROR:", error);
    res.status(500).json({ success: false });
  }
});


/* ===========================================================
   9️⃣  TRACKING LINKS LIST (JWT Protected)
=========================================================== */
router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const rows = await pool.query(
      `SELECT id AS tracking_link_id,
              tracking_id,
              url AS base_url,
              CONCAT(url, '?pub_id=', $1, '&click_id={click_id}&ua={ua}&msisdn={msisdn}') AS final_url
       FROM publisher_tracking_links
       WHERE publisher_id = $1`,
      [pub_id]
    );

    res.json({ success: true, links: rows.rows });

  } catch (error) {
    console.error("TRACKING ERROR:", error);
    res.status(500).json({ success: false });
  }
});

export default router;
