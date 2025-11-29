import express from "express";
import pool from "../db.js";

const router = express.Router();

/* -----------------------------------------------------
    1) GET META FROM TRACKING TABLE (BY pub_id)
----------------------------------------------------- */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const query = `
      SELECT 
        pub_id,
        publisher_name,
        geo,
        carrier,
        type,
        cap,
        tracking_link_id,
        url
      FROM tracking
      WHERE pub_id = $1
    `;

    const result = await pool.query(query, [pub_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Publisher not found" });
    }

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: "Internal Server Error META" });
  }
});

/* -----------------------------------------------------
    2) GET EXISTING RULES OF PUBLISHER
----------------------------------------------------- */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT r.id, r.pub_id, r.geo, r.carrier,
             r.offer_id, o.offer_code, o.offer_name, o.advertiser_name,
             r.percentage, r.is_fallback
      FROM distribution_rules r
      LEFT JOIN offers o ON r.offer_id = o.id
      WHERE r.pub_id = $1
      ORDER BY r.is_fallback DESC, r.percentage DESC
    `;

    const result = await pool.query(q, [pub_id]);
    return res.json({ success: true, data: result.rows });

  } catch (e) {
    console.error("RULES ERROR:", e);
    return res.status(500).json({ error: "Internal Server Error RULES" });
  }
});

/* -----------------------------------------------------
    3) GET ACTIVE OFFERS FOR DROPDOWN
----------------------------------------------------- */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    const q = `
      SELECT id, offer_code, offer_name, advertiser_name, geo, carrier, cap
      FROM offers
      WHERE status = 'Active'
      AND id <> COALESCE($1, -1)
      ORDER BY advertiser_name, offer_name
    `;

    const r = await pool.query(q, [exclude]);
    return res.json({ success: true, data: r.rows });

  } catch (e) {
    console.error("OFFERS ERROR:", e);
    return res.status(500).json({ error: "Internal Server Error OFFERS" });
  }
});

/* -----------------------------------------------------
    4) CALCULATE REMAINING % FOR NEW RULE
----------------------------------------------------- */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT COALESCE(SUM(percentage), 0) AS used
      FROM distribution_rules
      WHERE pub_id = $1 AND is_fallback = false
    `;

    const r = await pool.query(q, [pub_id]);

    const used = Number(r.rows[0].used);
    const remaining = 100 - used;

    return res.json({ success: true, remaining });

  } catch (e) {
    console.error("Remaining ERROR:", e);
    return res.status(500).json({ error: "Internal Server Error REMAINING" });
  }
});

/* -----------------------------------------------------
    5) ADD NEW DISTRIBUTION RULE
----------------------------------------------------- */
router.post("/rules", async (req, res) => {
  try {
    const { pub_id, geo, carrier, offer_id, percentage, is_fallback } = req.body;

    const q = `
      INSERT INTO distribution_rules (pub_id, geo, carrier, offer_id, percentage, is_fallback)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const r = await pool.query(q, [
      pub_id,
      geo,
      carrier,
      offer_id,
      percentage || 0,
      is_fallback || false,
    ]);

    return res.json({ success: true, data: r.rows[0] });

  } catch (e) {
    console.error("ADD RULE ERROR:", e);
    return res.status(500).json({ error: "Internal Server Error ADD RULE" });
  }
});

/* -----------------------------------------------------
    6) UPDATE RULE (percentage / fallback)
----------------------------------------------------- */
router.put("/rules/:id", async (req, res) => {
  try {
    const ruleId = req.params.id;
    const { percentage, is_fallback } = req.body;

    const q = `
      UPDATE distribution_rules
      SET percentage = $1,
          is_fallback = $2
      WHERE id = $3
      RETURNING *
    `;

    const r = await pool.query(q, [
      percentage,
      is_fallback,
      ruleId
    ]);

    return res.json({ success: true, data: r.rows[0] });

  } catch (e) {
    console.error("UPDATE RULE ERROR:", e);
    return res.status(500).json({ error: "Internal Server Error UPDATE RULE" });
  }
});

/* -----------------------------------------------------
    7) DELETE RULE
----------------------------------------------------- */
router.delete("/rules/:id", async (req, res) => {
  try {
    const ruleId = req.params.id;

    const q = `DELETE FROM distribution_rules WHERE id = $1`;
    await pool.query(q, [ruleId]);

    return res.json({ success: true });

  } catch (e) {
    console.error("DELETE RULE ERROR:", e);
    return res.status(500).json({ error: "Internal Server Error DELETE" });
  }
});

export default router;
