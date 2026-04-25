import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();

const BASE_URL = "https://dashboard.mob13r.com";

// 🔥 AWS SAFE PATHS
const TMP_UPLOAD_DIR = "/tmp/uploads/landings";
const PUBLIC_UPLOAD_DIR = path.join(process.cwd(), "public/uploads/landings");

// ✅ Ensure directories exist
if (!fs.existsSync(TMP_UPLOAD_DIR)) {
  fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(PUBLIC_UPLOAD_DIR)) {
  fs.mkdirSync(PUBLIC_UPLOAD_DIR, { recursive: true });
}

/* ================= GET ALL LANDINGS ================= */

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lp.*, 
             o.service_name AS offer_name, 
             pub.name AS publisher_name, 
             adv.name AS advertiser_name
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      JOIN offers o ON o.id = po.offer_id
      JOIN publishers pub ON pub.id = po.publisher_id
      JOIN advertisers adv ON adv.id = o.advertiser_id
      ORDER BY lp.id DESC
    `);

    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET LANDINGS ERROR:", err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ================= GET PUBLISHER OFFERS ================= */

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
    console.error("PUBLISHER OFFERS ERROR:", err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ================= CREATE LANDING ================= */

router.post("/", async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const {
      publisher_offer_id,
      title,
      description,
      button_text,
      disclaimer
    } = req.body;

    let finalImg = req.body.image_url || "";

    // 🔥 FILE UPLOAD HANDLING
    if (req.files && req.files.imageFile) {
      const file = req.files.imageFile;

      const ext = path.extname(file.name);
      const fName = `lp_${Date.now()}${ext}`;

      const tempPath = path.join(TMP_UPLOAD_DIR, fName);
      const publicPath = path.join(PUBLIC_UPLOAD_DIR, fName);

      try {
        // ✅ Save to /tmp first
        await file.mv(tempPath);

        // ✅ Copy to public folder
        await fs.promises.copyFile(tempPath, publicPath);

        finalImg = `/uploads/landings/${fName}`;

        console.log("✅ FILE SAVED:", finalImg);
      } catch (err) {
        console.error("❌ FILE SAVE ERROR:", err);
        return res.status(500).json({
          status: "FAILED",
          error: "File upload failed",
          details: err.message
        });
      }
    }

    // 🔥 INSERT DB
    const result = await pool.query(
      `INSERT INTO landing_pages 
      (publisher_offer_id, title, description, image_url, button_text, disclaimer)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id`,
      [publisher_offer_id, title, description, finalImg, button_text, disclaimer]
    );

    const id = result.rows[0].id;
    const url = `${BASE_URL}/landing/${id}`;

    await pool.query(
      `UPDATE landing_pages SET landing_url=$1 WHERE id=$2`,
      [url, id]
    );

    res.json({
      status: "SUCCESS",
      id,
      landing_url: url
    });

  } catch (err) {
    console.error("❌ LANDING CREATE ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      error: err.message
    });
  }
});

/* ================= GET SINGLE LANDING ================= */

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT lp.*, 
             po.offer_id, 
             p.api_key, 
             o.redirect_url, 
             o.geo, 
             o.carrier
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      JOIN publishers p ON p.id = po.publisher_id
      JOIN offers o ON o.id = po.offer_id
      WHERE lp.id = $1
      `,
      [req.params.id]
    );

    res.json({
      status: "SUCCESS",
      data: result.rows[0]
    });

  } catch (err) {
    console.error("GET SINGLE LANDING ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      error: err.message
    });
  }
});

export default router;
