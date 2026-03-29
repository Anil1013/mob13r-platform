import express from "express";
import pool from "../db.js";

const router = express.Router();

/* 🔥 GET ALL LANDINGS */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lp.*, o.service_name
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      JOIN offers o ON o.id = po.offer_id
      ORDER BY lp.id DESC
    `);

    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* 🔥 CREATE LANDING */
router.post("/", async (req, res) => {
  try {
    const {
      publisher_offer_id,
      title,
      description,
      image_url,
      button_text,
      disclaimer
    } = req.body;

    await pool.query(`
      INSERT INTO landing_pages
      (publisher_offer_id, title, description, image_url, button_text, disclaimer)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [publisher_offer_id, title, description, image_url, button_text, disclaimer]);

    res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* 🔥 GET SINGLE LANDING (IMPORTANT) */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        lp.*,
        po.offer_id,
        po.publisher_id
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      WHERE lp.publisher_offer_id = $1
    `, [id]);

    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "FAILED" });
  }
});

router.get("/publisher-offers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        po.id,
        o.service_name,
        p.name AS publisher_name
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      JOIN publishers p ON p.id = po.publisher_id
      ORDER BY po.id DESC
    `);

    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    res.status(500).json({ status: "FAILED" });
  }
});

export default router;
