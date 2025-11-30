import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* -----------------------------------------------------
   1️⃣ GET TRACKING LINKS (pub_id from frontend → pub_code in DB)
----------------------------------------------------- */
router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) {
      return res.status(400).json({ success: false, message: "pub_id is required" });
    }

    const q = `
      SELECT tracking_link_id, tracking_id, base_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY tracking_link_id DESC
    `;

    const { rows } = await pool.query(q, [pub_id]);

    res.json({ success: true, links: rows });
  } catch (err) {
    console.error("GET /tracking-links error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------------------
   2️⃣ GET META (pub_id → pub_code)
----------------------------------------------------- */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) {
      return res.status(400).json({ success: false, message: "pub_id is required" });
    }

    const q = `
      SELECT tracking_link_id, total_hit, remaining_hit
      FROM tracking_meta
      WHERE pub_code = $1
      ORDER BY tracking_link_id DESC
    `;

    const { rows } = await pool.query(q, [pub_id]);

    res.json({ success: true, meta: rows });
  } catch (err) {
    console.error("GET /meta error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------------------
   3️⃣ GET RULES (pub_id → pub_code)
----------------------------------------------------- */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res.status(400).json({
        success: false,
        message: "pub_id and tracking_link_id are required",
      });
    }

    const q = `
      SELECT id, offer_id, weight
      FROM publisher_offer_weight
      WHERE pub_code = $1 AND tracking_link_id = $2
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    res.json({ success: true, rules: rows });
  } catch (err) {
    console.error("GET /rules error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------------------
   4️⃣ ADD RULE  (pub_id → pub_code)
----------------------------------------------------- */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id, offer_id, weight } = req.body;

    if (!pub_id || !tracking_link_id || !offer_id || !weight) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const q = `
      INSERT INTO publisher_offer_weight
      (pub_code, tracking_link_id, offer_id, weight)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id, offer_id, weight]);

    res.json({ success: true, rule: rows[0] });
  } catch (err) {
    console.error("POST /rules error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------------------
   5️⃣ UPDATE RULE
----------------------------------------------------- */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { offer_id, weight } = req.body;

    const q = `
      UPDATE publisher_offer_weight
      SET offer_id = $1, weight = $2
      WHERE id = $3
      RETURNING *
    `;

    const { rows } = await pool.query(q, [offer_id, weight, id]);

    res.json({ success: true, rule: rows[0] });
  } catch (err) {
    console.error("PUT /rules/:id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -----------------------------------------------------
   6️⃣ DELETE RULE
----------------------------------------------------- */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const q = `
      DELETE FROM publisher_offer_weight
      WHERE id = $1
      RETURNING *
    `;

    const { rows } = await pool.query(q, [id]);

    res.json({ success: true, deleted: rows[0] });
  } catch (err) {
    console.error("DELETE /rules/:id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
