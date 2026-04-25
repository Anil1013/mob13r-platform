import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();

const BASE_URL = "https://dashboard.mob13r.com";

/* 🔥 UPLOAD DIR SAFETY */
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/landings");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* 🔥 GET ALL LANDINGS */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lp.id, lp.title, lp.description, lp.image_url, lp.button_text, 
        lp.disclaimer, lp.landing_url, o.service_name AS offer_name, 
        pub.name AS publisher_name, adv.name AS advertiser_name
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
    res.json({ status: "FAILED", error: err.message });
  }
});

/* 🔥 GET OFFERS */
router.get("/publisher-offers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        po.id, o.service_name, p.name AS publisher_name, 
        adv.name AS advertiser_name, p.api_key
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      JOIN publishers p ON p.id = po.publisher_id
      JOIN advertisers adv ON adv.id = o.advertiser_id
      ORDER BY po.id DESC
    `);

    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET OFFERS ERROR:", err);
    res.json({ status: "FAILED", error: err.message });
  }
});

/* 🔥 CREATE LANDING (500 Error & Multipart Fix) */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const publisher_offer_id = body.publisher_offer_id;
    const title = body.title || "";
    const description = body.description || "";
    const image_url = body.image_url || "";
    const button_text = body.button_text || "";
    const disclaimer = body.disclaimer || "";

    if (!publisher_offer_id) {
      return res.json({ status: "FAILED", message: "publisher_offer_id required" });
    }

    let finalImage = (image_url || "").trim();

    /* ================= MULTIPART FILE HANDLING ================= */
    // Check if files exist safely
    if (req.files && req.files.imageFile) {
      const file = req.files.imageFile;

      if (file && file.name && file.size > 0) {
        const ext = path.extname(file.name) || ".jpg";
        const fileName = `lp_${Date.now()}${ext}`;
        const savePath = path.join(UPLOAD_DIR, fileName);

        // ✅ Use await with a promise-friendly move function
        await file.mv(savePath);

        // ✅ Set the public URL path
        finalImage = `/uploads/landings/${fileName}`;
      }
    }

    /* ================= DB INSERT ================= */
    const result = await pool.query(
      `
      INSERT INTO landing_pages 
      (publisher_offer_id, title, description, image_url, button_text, disclaimer)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id
      `,
      [publisher_offer_id, title, description, finalImage, button_text, disclaimer]
    );

    const id = result.rows[0].id;
    const url = `https://dashboard.mob13r.com/landing/${id}`;

    // Update URL in database
    await pool.query(
      `UPDATE landing_pages SET landing_url=$1 WHERE id=$2`,
      [url, id]
    );

    res.json({
      status: "SUCCESS",
      id,
      landing_url: url,
    });

  } catch (err) {
    console.error("CRITICAL CREATE ERROR:", err);
    // ✅ Never send 500 status to prevent frontend crash, send 200 with FAILED status
    res.json({
      status: "FAILED",
      error: err.message,
    });
  }
});

/* 🔥 GET SINGLE LANDING */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.json({ status: "FAILED", message: "Invalid ID" });

    const result = await pool.query(
      `
      SELECT lp.*, po.offer_id, p.api_key, o.redirect_url
      FROM landing_pages lp
      JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      JOIN publishers p ON p.id = po.publisher_id
      JOIN offers o ON o.id = po.offer_id
      WHERE lp.id = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.json({ status: "FAILED", message: "Landing not found" });
    }

    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("GET SINGLE ERROR:", err);
    res.json({ status: "FAILED", error: err.message });
  }
});

export default router;
