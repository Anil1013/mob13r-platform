import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";  // correct middleware path

const router = express.Router();

/* ==========================
      META (Protected)
============================ */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id is required" });

    const publisher = await pool.query(
      "SELECT * FROM publishers WHERE pub_id = $1",
      [pub_id]
    );

    const trackingLinks = await pool.query(
      "SELECT * FROM tracking_links WHERE pub_id = $1 ORDER BY id ASC",
      [pub_id]
    );

    const offers = await pool.query(
      "SELECT offer_id, offer_name, advertiser_name FROM offers ORDER BY offer_id ASC"
    );

    res.json({
      publisher: publisher.rows[0] || null,
      tracking_links: trackingLinks.rows,
      offers: offers.rows,
    });
  } catch (error) {
    console.error("META Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==========================
      GET RULES (Protected)
============================ */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.status(400).json({ error: "pub_id is required" });

    const rules = await pool.query(
      "SELECT * FROM traffic_rules WHERE pub_id = $1 ORDER BY id ASC",
      [pub_id]
    );

    res.json(rules.rows);
  } catch (error) {
    console.error("RULES Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==========================
   REMAINING OFFERS (Protected)
============================ */
router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const remaining = await pool.query(
      `SELECT offer_id, offer_name, advertiser_name
       FROM offers
       WHERE offer_id NOT IN (
         SELECT offer_id FROM traffic_rules WHERE pub_id = $1
       )
       ORDER BY offer_id ASC`,
      [pub_id]
    );

    res.json(remaining.rows);
  } catch (error) {
    console.error("Remaining Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==========================
       OFFER LIST (Protected)
============================ */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const { exclude } = req.query;

    const offers = await pool.query(
      `SELECT offer_id, offer_name, advertiser_name
       FROM offers
       WHERE ($1::text IS NULL OR offer_id != $1)
       ORDER BY offer_id ASC`,
      [exclude || null]
    );

    res.json(offers.rows);
  } catch (error) {
    console.error("OFFERS Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==========================
      CREATE RULE (Protected)
============================ */
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
        pub_id, publisher_name,
        tracking_link_id, geo, carrier,
        offer_id, offer_name, advertiser_name,
        redirect_url, type, weight, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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

    res.json(result.rows[0]);
  } catch (error) {
    console.error("CREATE RULE Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==========================
     UPDATE RULE (Protected)
============================ */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const {
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

    const updateQuery = `
      UPDATE traffic_rules
      SET tracking_link_id = $1,
          geo = $2,
          carrier = $3,
          offer_id = $4::varchar,   -- FIX: OFF02 stays string
          offer_name = $5,
          advertiser_name = $6,
          redirect_url = $7,
          type = $8,
          weight = $9,
          status = $10
      WHERE id = $11
      RETURNING *
    `;

    const updated = await pool.query(updateQuery, [
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
      id,
    ]);

    res.json(updated.rows[0]);
  } catch (error) {
    console.error("UPDATE RULE Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ==========================
     DELETE RULE (Protected)
============================ */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM traffic_rules WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE RULE Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
