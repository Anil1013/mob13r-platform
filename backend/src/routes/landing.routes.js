import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();
const BASE_URL = "https://dashboard.mob13r.com";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/landings");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* CREATE LANDING */
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

    if (!publisher_offer_id) {
      return res.json({ status: "FAILED", message: "publisher_offer_id required" });
    }

    let finalImage = image_url || "";

    // ✅ FILE UPLOAD SUPPORT
    if (req.files && req.files.imageFile) {
      const file = req.files.imageFile;
      const fileName = `lp_${Date.now()}${path.extname(file.name)}`;
      const savePath = path.join(UPLOAD_DIR, fileName);

      await file.mv(savePath);

      finalImage = `/uploads/landings/${fileName}`;
    }

    const result = await pool.query(
      `INSERT INTO landing_pages
      (publisher_offer_id, title, description, image_url, button_text, disclaimer)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id`,
      [publisher_offer_id, title, description, finalImage, button_text, disclaimer]
    );

    const id = result.rows[0].id;
    const url = `${BASE_URL}/landing/${id}`;

    await pool.query(
      `UPDATE landing_pages SET landing_url=$1 WHERE id=$2`,
      [url, id]
    );

    res.json({ status: "SUCCESS", id, landing_url: url });

  } catch (err) {
    console.error("CREATE LANDING ERROR:", err);
    res.json({ status: "FAILED", error: err.message });
  }
});

export default router;
