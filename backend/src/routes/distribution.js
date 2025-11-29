import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================================
    1) META API 
    FETCH: publisher_name, geo, carrier, tracking urls (from tracking table)
====================================================================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ success: false, message: "pub_id required" });
    }

    // Fetch tracking rows for this publisher
    const trackRes = await pool.query(
      `
      SELECT 
        tracking_link_id,
        pub_id,
        publisher_name,
        geo,
        carrier,
        url AS tracking_url
      FROM tracking
      WHERE pub_id = $1
      ORDER BY id DESC
      `,
      [pub_id]
    );

    if (trackRes.rows.length === 0) {
      return res.json({ success: true, meta: [] });
    }

    res.json({
      success: true,
      meta: trackRes.rows,
    });

  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ======================================================================
    2) GET RULES FOR PUB_ID (traffic_rules)
====================================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const rules = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY weight DESC, id DESC
      `,
      [pub_id]
    );

    res.json({ success: true, rules: rules.rows });
  } catch (err) {
    console.error("RULES FETCH ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ======================================================================
    3) CREATE RULE (traffic_rules)
====================================================================== */
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
      `
      INSERT INTO traffic_rules (
        pub_id, publisher_name, tracking_link_id, geo, carrier,
        offer_id, offer_name, advertiser_name, redirect_url,
        type, weight, status
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12
      )
      RETURNING *
      `,
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

    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    console.error("RULE CREATE ERROR:", err);
    res.status(500).json({ success: false, message: "Insert failed" });
  }
});

/* ======================================================================
    4) UPDATE RULE
====================================================================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const fields = [
      "geo", "carrier", "offer_id", "offer_name",
      "advertiser_name", "redirect_url", "type", "weight", "status"
    ];

    const updates = [];
    const values = [];
    let index = 1;

    for (let field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${index}`);
        values.push(req.body[field]);
        index++;
      }
    }

    values.push(id);

    const updated = await pool.query(
      `
      UPDATE traffic_rules
      SET ${updates.join(", ")}
      WHERE id = $${index}
      RETURNING *
      `,
      values
    );

    res.json({ success: true, rule: updated.rows[0] });
  } catch (err) {
    console.error("RULE UPDATE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================================
    5) DELETE RULE
====================================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [id]);

    res.json({ success: true, message: "Rule deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================================
    6) REMAINING WEIGHT (max 100)
====================================================================== */
router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const used = await pool.query(
      `
      SELECT COALESCE(SUM(weight),0) AS total
      FROM traffic_rules
      WHERE pub_id = $1
      `,
      [pub_id]
    );

    const usedWeight = parseInt(used.rows[0].total);
    const remaining = 100 - usedWeight;

    res.json({ success: true, used: usedWeight, remaining });
  } catch (err) {
    console.error("WEIGHT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ======================================================================
    7) OFFER LIST (fallback + active)
    FILTER BY: geo + carrier + NOT already selected
====================================================================== */
router.get("/offers", authJWT, async (req, res) => {
  try {
    let { geo, carrier, exclude } = req.query;

    exclude = exclude ? exclude.split(",") : [];

    const offers = await pool.query(
      `
      SELECT offer_id, advertiser_name, name AS offer_name, cap
      FROM offers
      WHERE geo = $1
      AND carrier = $2
      AND offer_id != ALL($3)
      AND status = 'active'
      ORDER BY id DESC
      `,
      [geo, carrier, exclude]
    );

    res.json({ success: true, offers: offers.rows });
  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
