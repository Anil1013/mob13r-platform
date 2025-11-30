import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   1️⃣ GET TRACKING LINKS BY PUB CODE
   ====================================================== */
router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ success: false, error: "pub_id is required" });
    }

    const q = `
      SELECT 
        id,
        pub_code,
        publisher_id,
        publisher_name,
        name AS tracking_name,
        geo,
        carrier,
        tracking_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);

    return res.json({ success: true, links: rows });

  } catch (err) {
    console.error("GET /tracking-links ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   2️⃣ GET META INFORMATION FOR A TRACKING LINK
   ====================================================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ success: false, error: "pub_id is required" });
    }

    const q = `
      SELECT 
        id AS tracking_link_id,
        pub_code,
        name AS tracking_name,
        geo,
        carrier,
        cap_daily,
        cap_total,
        hold_percent
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);

    return res.json({ success: true, meta: rows });

  } catch (err) {
    console.error("GET /meta ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   3️⃣ GET RULES FOR A TRACKING LINK
   ====================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res.status(400).json({
        success: false,
        error: "pub_id & tracking_link_id required",
      });
    }

    const q = `
      SELECT 
        id,
        tracking_link_id,
        offer_id,
        geo,
        carrier,
        percentage AS weight,
        is_fallback,
        status
      FROM publisher_offer_distribution
      WHERE tracking_link_id = $1
        AND status = 'active'
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [tracking_link_id]);

    return res.json({ success: true, rules: rows });

  } catch (err) {
    console.error("GET /rules ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   4️⃣ ADD RULE
   ====================================================== */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const {
      pub_id,
      tracking_link_id,
      offer_id,
      weight,
    } = req.body;

    if (!pub_id || !tracking_link_id || !offer_id || !weight) {
      return res.status(400).json({ success: false, error: "missing params" });
    }

    // CHECK REMAINING %
    const rem = await pool.query(
      `SELECT 100 - COALESCE(SUM(percentage),0) AS remain
       FROM publisher_offer_distribution
       WHERE tracking_link_id=$1 AND is_fallback=false AND status='active'`,
      [tracking_link_id]
    );

    if (weight > rem.rows[0].remain) {
      return res.status(400).json({
        success: false,
        error: `Only ${rem.rows[0].remain}% remaining.`,
      });
    }

    const q = `
      INSERT INTO publisher_offer_distribution
      (tracking_link_id, offer_id, percentage, is_fallback, status, created_at, updated_at)
      VALUES ($1,$2,$3,false,'active',NOW(),NOW())
      RETURNING *
    `;

    const { rows } = await pool.query(q, [
      tracking_link_id,
      offer_id,
      weight
    ]);

    return res.json({ success: true, rule: rows[0] });

  } catch (err) {
    console.error("POST /rules ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   5️⃣ UPDATE RULE
   ====================================================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { offer_id, weight } = req.body;

    const q = `
      UPDATE publisher_offer_distribution
      SET offer_id = $1,
          percentage = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const { rows } = await pool.query(q, [offer_id, weight, id]);

    return res.json({ success: true, rule: rows[0] });

  } catch (err) {
    console.error("PUT /rules ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   6️⃣ DELETE RULE (SOFT DELETE)
   ====================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const q = `
      UPDATE publisher_offer_distribution
      SET status='inactive', updated_at=NOW()
      WHERE id=$1 RETURNING *
    `;

    const { rows } = await pool.query(q, [id]);

    return res.json({ success: true, deleted: rows[0] });

  } catch (err) {
    console.error("DELETE /rules ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
