import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js"; // ✅ Correct middleware import

const router = express.Router();

// -----------------------------------------------------
//  GET META: Publisher details + Offers list
// -----------------------------------------------------
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ error: "pub_id is required" });
    }

    // -----------------------------------------------
    // 1) Get publisher metadata from publisher_tracking_links
    //    (WE USE pub_code — not pub_id)
    // -----------------------------------------------
    const publisherQuery = `
      SELECT 
        pub_code,
        publisher_name,
        name AS offer_name,
        geo,
        carrier,
        type,
        payout,
        cap_daily,
        cap_total,
        hold_percent,
        landing_page
      FROM publisher_tracking_links
      WHERE pub_code = $1
    `;

    const publisherResult = await pool.query(publisherQuery, [pub_id]);

    // If no publisher found
    if (publisherResult.rows.length === 0) {
      return res.status(200).json({
        publisher: null,
        offers: [],
      });
    }

    const publisherMeta = publisherResult.rows[0];

    // -----------------------------------------------
    // 2) Get ALL offers from offers table
    // -----------------------------------------------
    const offersQuery = `
      SELECT 
        id,
        offer_id,
        advertiser_id,
        name,
        country,
        carrier,
        type,
        payout,
        cap_daily,
        cap_total,
        hold_percent,
        status
      FROM offers
      ORDER BY id DESC
    `;

    const offersResult = await pool.query(offersQuery);

    // -----------------------------------------------
    // Response
    // -----------------------------------------------
    return res.status(200).json({
      publisher: publisherMeta,
      offers: offersResult.rows,
    });

  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// -----------------------------------------------------
// EXPORT ROUTER
// -----------------------------------------------------
export default router;
