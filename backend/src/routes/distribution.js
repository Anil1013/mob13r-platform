import express from "express";
import pool from "../db.js";

const router = express.Router();

/* ==========================
    GET META
============================ */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const publisher = await pool.query(
      `SELECT * FROM publishers WHERE pub_id = $1`,
      [pub_id]
    );

    const trackingLinks = await pool.query(
      `SELECT id, link_name FROM tracking_links WHERE pub_id = $1`,
      [pub_id]
    );

    const offers = await pool.query(
      `SELECT offer_id, offer_name FROM offers`
    );

    res.json({
      publisher: publisher.rows[0] || null,
      trackingLinks: trackingLinks.rows,
      offers: offers.rows,
    });
  } catch (err) {
    console.error("META Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================
    GET RULES
============================ */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const rules = await pool.query(
      `SELECT * FROM traffic_rules WHERE pub_id = $1 ORDER BY id DESC`,
      [pub_id]
    );

    res.json(rules.rows);
  } catch (err) {
    console.error("Get Rules Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================
    GET REMAINING OFFERS
============================ */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const used = await pool.query(
      `SELECT offer_id FROM traffic_rules WHERE pub_id = $1`,
      [pub_id]
    );

    const usedIds = used.rows.map(r => r.offer_id);

    const remaining = await pool.query(
      `SELECT offer_id, offer_name FROM offers WHERE offer_id NOT IN ($1::varchar[])`,
      [usedIds.length ? usedIds : ["NONE"]]
    );

    res.json(remaining.rows);
  } catch (err) {
    console.error("Remaining Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================
    GET OFFERS (Exclude One)
============================ */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    const offers = await pool.query(
      `SELECT offer_id, offer_name FROM offers WHERE offer_id != $1`,
      [exclude]
    );

    res.json(offers.rows);
  } catch (err) {
    console.error("Offers Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================
    CREATE RULE
============================ */
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

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create Rule Error:", err);
    res.status(500).json({ error: "Insert Failed" });
  }
});

/* ==========================
    UPDATE RULE  (OFFER FIXED)
============================ */
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

    for (const field of fields) {
      if (req.body[field] !== undefined) {

        // 🔥 FIX: OFFER ID AS VARCHAR (stop "2" replacing "OFF02")
        if (field === "offer_id") {
          updates.push(`${field} = $${index}::varchar`);
        } else {
          updates.push(`${field} = $${index}`);
        }

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

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update Rule Error:", err);
    res.status(500).json({ error: "Update Failed" });
  }
});

/* ==========================
    DELETE RULE
============================ */
router.delete("/rules/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [
      req.params.id,
    ]);

    res.json({ success: true, message: "Rule deleted" });
  } catch (err) {
    console.error("Delete Rule Error:", err);
    res.status(500).json({ error: "Delete Failed" });
  }
});

export default router;
