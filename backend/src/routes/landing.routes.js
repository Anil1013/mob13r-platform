import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();
const BASE_URL = "https://dashboard.mob13r.com";
const UPLOAD_PATH = "public/uploads/landings";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

/* 🔥 GET ALL LANDINGS - (Same structure) */
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

/* 🔥 CREATE LANDING WITH IMAGE UPLOAD */
router.post("/", async (req, res) => {
    try {
        const { publisher_offer_id, title, description, button_text, disclaimer } = req.body;
        let finalImageUrl = req.body.image_url || "";

        // Handle File Upload
        if (req.files && req.files.imageFile) {
            const file = req.files.imageFile;
            const fileName = `lp_${Date.now()}${path.extname(file.name)}`;
            const savePath = path.join(UPLOAD_PATH, fileName);
            
            await file.mv(savePath);
            finalImageUrl = `https://backend.mob13r.com/uploads/landings/${fileName}`;
        }

        const result = await pool.query(
            `INSERT INTO landing_pages (publisher_offer_id, title, description, image_url, button_text, disclaimer)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [publisher_offer_id, title, description, finalImageUrl, button_text, disclaimer]
        );

        const id = result.rows[0].id;
        const url = `${BASE_URL}/landing/${id}`;
        await pool.query(`UPDATE landing_pages SET landing_url=$1 WHERE id=$2`, [url, id]);

        res.json({ status: "SUCCESS", id, landing_url: url });
    } catch (err) {
        res.json({ status: "FAILED", error: err.message });
    }
});

/* 🔥 GET OFFERS & SINGLE LANDING Logic (Keep same as yours) */
router.get("/publisher-offers", async (req, res) => { /* logic stays same */ });
router.get("/:id", async (req, res) => { /* logic stays same */ });

export default router;
