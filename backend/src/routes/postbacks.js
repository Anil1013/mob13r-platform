import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

/**
 * 💰 RECEIVE ADVERTISER POSTBACK
 * Example: /api/postback?clickid=abcd1234&status=approved&amount=2.5
 */
router.get("/", async (req, res) => {
  const { clickid, status = "approved", amount = 0, txid } = req.query;

  if (!clickid) return res.status(400).send("Missing clickid");

  try {
    // 1️⃣ Find click in database
    const clickRes = await pool.query(
      `SELECT c.*, o.id AS offer_id, o.advertiser_id, o.publisher_id, o.publisher_payout
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

    // 3️⃣ Get publisher’s postback URL
    const pub = await pool.query(
      "SELECT postback_url FROM publishers WHERE id=$1",
      [c.publisher_id]
    );
    const publisherPostback = pub.rows[0]?.postback_url;

    if (publisherPostback) {
      const finalPostback = publisherPostback
        .replace("{clickid}", clickid)
        .replace("{status}", status)
        .replace("{amount}", amount);

      // Fire publisher postback
      axios
        .get(finalPostback)
        .then(() => console.log("✅ Publisher Postback Sent:", finalPostback))
        .catch((err) => console.error("⚠️ Failed to send publisher postback:", err.message));
    } else {
      console.log("ℹ️ No publisher postback found for this publisher");
    }

    res.send("✅ Conversion Recorded");
  } catch (err) {
    console.error("❌ Postback Error:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
