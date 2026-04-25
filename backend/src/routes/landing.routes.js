import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();
const BASE_URL = "https://dashboard.mob13r.com";
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/landings");

// Safety: Create folder if not exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* 🔥 GET ALL LANDINGS */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lp.id, lp.title, lp.description, lp.image_url, lp.button_text, lp.disclaimer, lp.landing_url,
             o.service_name AS offer_name, pub.name AS publisher_name, adv.name AS advertiser_name
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

/* 🔥 CREATE LANDING - 100% Logic Safe */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const { publisher_offer_id, title, description, image_url, button_text, disclaimer } = body;

    if (!publisher_offer_id) {
      return res.json({ status: "FAILED", message: "publisher_offer_id required" });
    }

    let finalImage = (image_url || "").trim();

    // ✅ Multi-format Upload Logic
    if (req.files && req.files.imageFile) {
      try {
        const file = req.files.imageFile;
        const ext = path.extname(file.name) || ".jpg";
        const fileName = `lp_${Date.now()}${ext}`;
        await file.mv(path.join(UPLOAD_DIR, fileName));
        finalImage = `/uploads/landings/${fileName}`;
      } catch (fErr) {
        console.error("File Save Error, Falling back to URL");
      }
    }

    const result = await pool.query(
      `INSERT INTO landing_pages (publisher_offer_id, title, description, image_url, button_text, disclaimer)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [publisher_offer_id, title, description, finalImage, button_text, disclaimer]
    );

    const id = result.rows[0].id;
    const url = `https://dashboard.mob13r.com/landing/${id}`;
    await pool.query(`UPDATE landing_pages SET landing_url=$1 WHERE id=$2`, [url, id]);

    res.json({ status: "SUCCESS", id, landing_url: url });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.json({ status: "FAILED", error: err.message }); // ✅ NEVER send 500
  }
});

/* 🔥 Baaki GET offers aur single landing as-it-is rahega */
router.get("/publisher-offers", async (req, res) => {
  try {
    const result = await pool.query(`SELECT po.id, o.service_name, p.name AS publisher_name, adv.name AS advertiser_name, p.api_key FROM publisher_offers po JOIN offers o ON o.id = po.offer_id JOIN publishers p ON p.id = po.publisher_id JOIN advertisers adv ON adv.id = o.advertiser_id ORDER BY po.id DESC`);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) { res.json({ status: "FAILED", error: err.message }); }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(`SELECT lp.*, po.offer_id, p.api_key, o.redirect_url FROM landing_pages lp JOIN publisher_offers po ON po.id = lp.publisher_offer_id JOIN publishers p ON p.id = po.publisher_id JOIN offers o ON o.id = po.offer_id WHERE lp.id = $1`, [req.params.id]);
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) { res.json({ status: "FAILED", error: err.message }); }
});

export default router;
