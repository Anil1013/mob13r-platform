import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

/**
 * 📥 Example:
 * /api/postback?clickid=abcd1234&status=approved&amount=2.5
 */
router.get("/", async (req, res) => {
  const { clickid, status = "approved", amount = 0, txid } = req.query;
  if (!clickid) return res.status(400).send("Missing clickid");

  try {
    // 1️⃣ Find the click in DB
    const clickRes = await pool.query(
      `SELECT c.*, o.id AS offer_id, o.advertiser_id, o.publisher_payout
       FROM clicks c
       JOIN offers o ON c.offer_id = o.id
       WHERE c.clickid=$1`,
      [clickid]
    );

    if (!clickRes.rowCount) return res.status(404).send("Click not found");

    const c = clickRes.rows[0];

    // 2️⃣ Insert conversion
    await pool.query(
      `INSERT INTO conversions (clickid, offer_id, publisher_id, advertiser_id, payout, status, advertiser_txid)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (clickid) DO NOTHING`,
      [clickid, c.offer_id, c.publisher_id, c.advertiser_id, amount || c.publisher_payout, status, txid]
    );

    // 3️⃣ Fetch publisher’s postback URL
    const pubRes = await pool.query("SELECT postback_url FROM publishers WHERE id=$1", [c.publisher_id]);
    const pubUrl = pubRes.rows[0]?.postback_url;

    // 4️⃣ Fire postback to publisher if exists
    if (pubUrl) {
      const finalUrl = pubUrl
        .replace("{clickid}", clickid)
        .replace("{status}", status)
        .replace("{amount}", amount);

      axios
        .get(finalUrl)
        .then(() => console.log("✅ Publisher postback sent:", finalUrl))
        .catch((err) => console.error("⚠️ Publisher postback failed:", err.message));
    } else {
      console.log("ℹ️ Publisher has no postback URL");
    }

    res.send("✅ Conversion recorded");
  } catch (err) {
    console.error("❌ Postback error:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
