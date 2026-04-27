import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs"; // ✅ Added FS for directory safety

const router = express.Router();
const BASE_URL = "https://dashboard.mob13r.com";
const UPLOAD_DIR = "public/uploads/landings";

// ✅ Safety Check: Create directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* 🔥 GET ALL LANDINGS */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lp.*, o.service_name AS offer_name, pub.name AS publisher_name, adv.name AS advertiser_name
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      JOIN offers o ON o.id = po.offer_id
      JOIN publishers pub ON pub.id = po.publisher_id
      JOIN advertisers adv ON adv.id = o.advertiser_id
      ORDER BY lp.id DESC
    `);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    res.json({ status: "FAILED", error: err.message });
  }
});

/* 🔥 GET OFFERS (FOR DROPDOWN) */
router.get("/publisher-offers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT po.id, o.service_name, p.name AS publisher_name
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      JOIN publishers p ON p.id = po.publisher_id
    `);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    res.json({ status: "FAILED", error: err.message });
  }
});

/* 🔥 CREATE LANDING (Supports Image Upload) */
router.post("/", async (req, res) => {
  try {
    const { publisher_offer_id, title, description, image_url, button_text, disclaimer } = req.body;
    let finalImg = image_url;

    // ✅ Image File Handling
    if (req.files && req.files.imageFile) {
      const file = req.files.imageFile;
      const fName = `lp_${Date.now()}${path.extname(file.name)}`;
      
      // Using .mv() which is provided by express-fileupload
      await file.mv(`${UPLOAD_DIR}/${fName}`);
      finalImg = `https://backend.mob13r.com/uploads/landings/${fName}`;
    }

    const result = await pool.query(
      `INSERT INTO landing_pages (publisher_offer_id, title, description, image_url, button_text, disclaimer)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [publisher_offer_id, title, description, finalImg, button_text, disclaimer]
    );

    const id = result.rows[0].id;
    const url = `${BASE_URL}/landing/${id}`;
    await pool.query(`UPDATE landing_pages SET landing_url=$1 WHERE id=$2`, [url, id]);

    res.json({ status: "SUCCESS", id, landing_url: url });
  } catch (err) {
    res.json({ status: "FAILED", error: err.message });
  }
});

/* 🔥 GET SINGLE LANDING */
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lp.*, po.offer_id, p.api_key, o.redirect_url, o.geo, o.carrier
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      JOIN publishers p ON p.id = po.publisher_id
      JOIN offers o ON o.id = po.offer_id
      WHERE lp.id = $1`, [req.params.id]);
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    res.json({ status: "FAILED", error: err.message });
  }
});

export default router;
