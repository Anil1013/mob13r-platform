import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   1) GET TRACKING LINKS (publisher_tracking_links)
   ====================================================== */
router.get("/tracking-links", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) return res.status(400).json({ success: false, msg: "pub_id required" });

    const query = `
      SELECT 
        tracking_link_id,
        pub_code,
        publisher_id,
        publisher_name,
        tracking_id,
        base_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY tracking_link_id ASC
    `;

    const { rows } = await pool.query(query, [pub_id]);
    return res.json({ success: true, links: rows });
  } catch (err) {
    console.error("GET /tracking-links error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   2) GET META INFORMATION FOR SELECTED LINK
   ====================================================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT
        t.tracking_link_id,
        t.pub_code,
        t.tracking_id,
        t.base_url,
        COALESCE(SUM(r.percentage), 0) AS total_percentage,
        100 - COALESCE(SUM(r.percentage), 0) AS remaining_percentage
      FROM publisher_tracking_links t
      LEFT JOIN publisher_offer_distribution r
          ON r.tracking_link_id = t.tracking_link_id 
          AND r.status = 'active'
      WHERE t.pub_code = $1
      GROUP BY t.tracking_link_id
      ORDER BY t.tracking_link_id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);

    return res.json({ success: true, meta: rows });
  } catch (err) {
    console.error("META error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   3) GET RULES FOR A SELECTED TRACKING LINK
   ====================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const q = `
      SELECT 
        id,
        offer_id,
        geo,
        carrier,
        percentage AS weight,
        is_fallback,
        status
      FROM publisher_offer_distribution
      WHERE pub_code = $1 AND tracking_link_id = $2
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id, tracking_link_id]);

    return res.json({ success: true, rules: rows });
  } catch (err) {
    console.error("RULES error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   4) ADD NEW RULE
   ====================================================== */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id, offer_id, weight, geo, carrier } = req.body;

    const insert = `
      INSERT INTO publisher_offer_distribution
      (pub_code, tracking_link_id, offer_id, percentage, geo, carrier, is_fallback, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,false,'active',NOW(),NOW())
      RETURNING *
    `;

    const values = [pub_id, tracking_link_id, offer_id, weight, geo, carrier];

    const { rows } = await pool.query(insert, values);

    return res.json({ success: true, rule: rows[0] });
  } catch (err) {
    console.error("ADD RULE error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   5) UPDATE RULE
   ====================================================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { offer_id, weight, geo, carrier } = req.body;

    const q = `
      UPDATE publisher_offer_distribution
      SET offer_id=$1, percentage=$2, geo=$3, carrier=$4, updated_at=NOW()
      WHERE id=$5
      RETURNING *
    `;

    const { rows } = await pool.query(q, [offer_id, weight, geo, carrier, id]);

    return res.json({ success: true, rule: rows[0] });
  } catch (err) {
    console.error("UPDATE RULE error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   6) DELETE RULE (Soft Delete → status inactive)
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
    console.error("DELETE RULE error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


/* ======================================================
   7) AUTO GENERATE Click URL for Frontend (optional)
   ====================================================== */
router.get("/generate-url", authJWT, async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;

    if (!pub_id) return res.json({ success: false, msg: "pub_id required" });

    const finalURL = `https://backend.mob13r.com/click?pub_id=${pub_id}&geo=${geo || "BD"}&carrier=${carrier || "Robi"}`;

    return res.json({ success: true, url: finalURL });

  } catch (err) {
    console.error("URL GENERATE error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
