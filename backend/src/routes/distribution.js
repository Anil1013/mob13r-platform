import express from "express";
import db from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

// GET META — Fetch PTL + Offers
router.get("/meta", authJWT, async (req, res) => {
  try {
    const pub_code = req.query.pub_id; // frontend sends pub_id = "PUB01"

    if (!pub_code) {
      return res.status(400).json({ message: "pub_id is required" });
    }

    // 1️⃣ Publisher Side Data — publisher_tracking_links
    const ptlQuery = `
      SELECT 
        id,
        pub_code,
        publisher_id,
        publisher_name,
        name AS offer_name,
        geo,
        carrier,
        type,
        payout,
        cap_daily,
        cap_total,
        hold_percent,
        landing_page_url,
        tracking_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
    `;

    const ptlResult = await db.query(ptlQuery, [pub_code]);

    // 2️⃣ Advertiser Side Data — offers table
    const offersQuery = `
      SELECT 
        id,
        offer_id,
        name,
        geo,
        carrier,
        payout,
        cap_daily,
        cap_total,
        status
      FROM offers
    `;

    const offersResult = await db.query(offersQuery);

    return res.json({
      publisher_tracking_links: ptlResult.rows,
      offers: offersResult.rows,
    });

  } catch (error) {
    console.error("META ERROR:", error);
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
});

export default router;
