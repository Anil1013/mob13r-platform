import express from "express";
import pool from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/distribution/meta?pub_id=PUB03
 */
router.get("/meta", auth, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ error: "pub_id is required" });
    }

    // ----- STEP 1: Fetch tracking row -----
    const trackingQuery = `
      SELECT 
        id,
        pub_id,
        publisher_id,
        publisher_name,
        tracking_url,
        geo,
        carrier
      FROM tracking 
      WHERE pub_id = $1
      LIMIT 1;
    `;

    const trackingResult = await pool.query(trackingQuery, [pub_id]);

    if (trackingResult.rowCount === 0) {
      return res.status(404).json({ error: "Publisher tracking not found" });
    }

    const track = trackingResult.rows[0];

    // ----- STEP 2: Build final URL -----
    let finalUrl = track.tracking_url;

    // Optional default params
    const defaultParams = {
      ua: "{user_agent}",
      msisdn: "{msisdn}",
      sub1: "{click_id}",
      sub2: "{sub2}",
      sub3: "{sub3}"
    };

    // add parameters dynamically
    const paramString = Object.entries(defaultParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    if (finalUrl.includes("?"))
      finalUrl = `${finalUrl}&${paramString}`;
    else
      finalUrl = `${finalUrl}?${paramString}`;

    // ----- RESPONSE -----
    return res.json({
      pub_id: track.pub_id,
      publisher_name: track.publisher_name,
      geo: track.geo,
      carrier: track.carrier,
      base_tracking_url: track.tracking_url,
      final_tracking_url: finalUrl
    });

  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
