import express from "express";
import pool from "../db.js";

const router = express.Router();

/* ==========================
   GET ALL TRAFFIC RULES
============================= */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const result = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
      ORDER BY weight DESC, id DESC
      `,
      [pub_id, tracking_link_id]
    );

    res.json({ success: true, rules: result.rows });
  } catch (err) {
    console.error("Error fetching rules:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* ==========================
   CREATE NEW RULE
============================= */
router.post("/rules", async (req, res) => {
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
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10,$11,$12
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
    console.error("Error creating rule:", err);
    res.status(500).json({ success: false, message: "Insert failed" });
  }
});

/* ==========================
   UPDATE RULE
============================= */
router.put("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const fields = [
      "geo",
      "carrier",
      "offer_id",
      "offer_name",
      "advertiser_name",
      "redirect_url",
      "type",
      "weight",
      "status",
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

    const result = await pool.query(
      `
      UPDATE traffic_rules 
      SET ${updates.join(", ")}
      WHERE id = $${index}
      RETURNING *
      `,
      values
    );

    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    console.error("Error updating rule:", err);
    res.status(500).json({ success: false });
  }
});

/* ==========================
   DELETE RULE
============================= */
router.delete("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [id]);

    res.json({ success: true, message: "Rule deleted" });
  } catch (err) {
    console.error("Error deleting rule:", err);
    res.status(500).json({ success: false });
  }
});

/* ==========================
   CHECK REMAINING WEIGHT (%)
============================= */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const result = await pool.query(
      `
      SELECT COALESCE(SUM(weight),0) AS total_weight
      FROM traffic_rules
      WHERE pub_id = $1 AND tracking_link_id = $2
      `,
      [pub_id, tracking_link_id]
    );

    const used = parseInt(result.rows[0].total_weight);
    const remaining = 100 - used;

    res.json({ success: true, used, remaining });
  } catch (err) {
    console.error("Error checking weight:", err);
    res.status(500).json({ success: false });
  }
});

/* ==========================
   FETCH PUBLISHERS
============================= */
router.get("/publishers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pub_id, publisher_name 
      FROM publishers
    `);

    res.json({ success: true, publishers: result.rows });
  } catch (err) {
    console.error("Error fetching publishers:", err);
    res.status(500).json({ success: false });
  }
});

/* ==========================
   FETCH OFFERS
============================= */
router.get("/offers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT offer_id, name 
      FROM offers
    `);

    res.json({ success: true, offers: result.rows });
  } catch (err) {
    console.error("Error fetching offers:", err);
    res.status(500).json({ success: false });
  }
});

/* ==========================
   FETCH TRACKING LINKS
============================= */
router.get("/tracking-links", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, publisher_id, tracking_id, url
      FROM publisher_tracking_links
    `);

    res.json({ success: true, links: result.rows });
  } catch (err) {
    console.error("Error fetching tracking links:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
