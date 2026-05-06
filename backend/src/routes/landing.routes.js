import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();
const FRONTEND_BASE_URL = "https://dashboard.mob13r.com"; 
const BACKEND_URL = "https://backend.mob13r.com";
const UPLOAD_DIR = "public/uploads/landings";

// Directory check
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o777 });
}

/* 🔥 CREATE LANDING PAGE */
router.post("/", async (req, res) => {
  try {
    const { publisher_offer_id, title, description, image_url, button_text, disclaimer } = req.body;
    let finalImg = image_url;

    // Validate integer ID
    const offerIdInt = parseInt(publisher_offer_id);
    if (isNaN(offerIdInt)) {
      return res.status(400).json({ status: "FAILED", error: "Invalid publisher_offer_id" });
    }

    if (req.files && req.files.imageFile) {
      const file = req.files.imageFile;
      const fName = `lp_${Date.now()}${path.extname(file.name)}`;
      
      // Ensure folder is writable
      await file.mv(path.join(UPLOAD_DIR, fName));
      finalImg = `${BACKEND_URL}/uploads/landings/${fName}`;
    }

    const result = await pool.query(
      `INSERT INTO landing_pages (publisher_offer_id, title, description, image_url, button_text, disclaimer)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [offerIdInt, title, description, finalImg, button_text, disclaimer]
    );

    const id = result.rows[0].id;
    const landingUrl = `${FRONTEND_BASE_URL}/landing/${id}`;
    
    await pool.query(`UPDATE landing_pages SET landing_url=$1 WHERE id=$2`, [landingUrl, id]);

    res.json({ status: "SUCCESS", id, landing_url: landingUrl });
  } catch (err) {
    console.error("Route Error:", err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

// ... Baki GET routes wahi rahenge
export default router;
