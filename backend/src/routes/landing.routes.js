import express from "express";
import pool from "../db.js";

const router = express.Router();

/* ============================= */
/* 🔥 GET ALL LANDINGS */
/* ============================= */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lp.*,
        o.service_name
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      JOIN offers o ON o.id = po.offer_id
      ORDER BY lp.id DESC
    `);

    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET LANDINGS ERROR:", err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* ============================= */
/* 🔥 GET PUBLISHER OFFERS */
/* ⚠️ IMPORTANT: ABOVE /:id */
/* ============================= */
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
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* ============================= */
/* 🔥 CREATE LANDING */
/* ============================= */
router.post("/", async (req, res) => {
  try {
    const {
      publisher_offer_id,
      title,
      description,
      image_url,
      button_text,
      disclaimer,
    } = req.body;

    if (!publisher_offer_id || isNaN(publisher_offer_id)) {
      return res.json({
        status: "FAILED",
        message: "publisher_offer_id required",
      });
    }

    await pool.query(
      `
      INSERT INTO landing_pages
      (publisher_offer_id, title, description, image_url, button_text, disclaimer)
      VALUES ($1,$2,$3,$4,$5,$6)
    `,
      [
        publisher_offer_id,
        title,
        description,
        image_url,
        button_text,
        disclaimer,
      ]
    );

    res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("CREATE LANDING ERROR:", err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* ============================= */
/* 🔥 GET SINGLE LANDING */
/* ============================= */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        lp.*,
        po.offer_id
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      WHERE lp.id = $1
      LIMIT 1
    `,
      [Number(id)]
    );

    if (!result.rows.length) {
      return res.json({ status: "FAILED", message: "Landing not found" });
    }

    res.json({
      status: "SUCCESS",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("GET LANDING ERROR:", err);
    res.status(500).json({ status: "FAILED" });
  }
});

export default router;
