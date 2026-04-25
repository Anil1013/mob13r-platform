import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();
const BASE_URL = "https://dashboard.mob13r.com";
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/landings");

// ensure folder
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ✅ IMPORTANT: STATIC SERVE (server.js में होना चाहिए)
// app.use("/uploads", express.static("public/uploads"));

router.post("/", async (req, res) => {
  try {
    const {
      publisher_offer_id,
      title,
      description,
      button_text,
      disclaimer
    } = req.body;

    let finalImg = req.body.image_url || "";

    // 🔥 SAFE FILE HANDLING
    if (req.files && req.files.imageFile) {
      const file = req.files.imageFile;

      if (!file.name) {
        return res.status(400).json({ error: "Invalid file" });
      }

      const ext = path.extname(file.name);
      const fName = `lp_${Date.now()}${ext}`;
      const savePath = path.join(UPLOAD_DIR, fName);

      await file.mv(savePath);

      finalImg = `/uploads/landings/${fName}`;
    }

    const result = await pool.query(
      `INSERT INTO landing_pages 
       (publisher_offer_id, title, description, image_url, button_text, disclaimer)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [publisher_offer_id, title, description, finalImg, button_text, disclaimer]
    );

    const id = result.rows[0].id;
    const url = `${BASE_URL}/landing/${id}`;

    await pool.query(
      `UPDATE landing_pages SET landing_url=$1 WHERE id=$2`,
      [url, id]
    );

    res.json({ status: "SUCCESS", id, landing_url: url });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

export default router;
