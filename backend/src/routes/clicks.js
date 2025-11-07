import express from "express";
import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

/**
 * 📥 Example:
 * /api/click?offer_id=10&pub_id=5&sub1=xyz
 */
router.get("/", async (req, res) => {
  try {
    const { offer_id, pub_id, sub1 } = req.query;

    if (!offer_id || !pub_id)
      return res.status(400).send("Missing offer_id or pub_id");

    const clickid = uuidv4();

    // Save click
    await pool.query(
      `INSERT INTO clicks (offer_id, publisher_id, clickid, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5)`,
      [offer_id, pub_id, clickid, req.ip, req.get("user-agent")]
    );

    // Fetch advertiser click URL
    const offer = await pool.query("SELECT click_url FROM offers WHERE id=$1", [offer_id]);
    if (!offer.rowCount) return res.status(404).send("Offer not found");

    let advertiserUrl = offer.rows[0].click_url;

    // Replace macros dynamically
    advertiserUrl = advertiserUrl
      .replace("{clickid}", clickid)
      .replace("{pub_id}", pub_id || "")
      .replace("{sub1}", sub1 || "");

    console.log("🔗 Redirecting to Advertiser:", advertiserUrl);

    res.redirect(advertiserUrl);
  } catch (err) {
    console.error("❌ Click error:", err.message);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
