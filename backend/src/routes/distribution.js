import express from "express";
import pool from "../db.js";
const router = express.Router();

/**
 * GET META DATA BY PUB_ID
 * Returns: publisher_name, geo list, carrier list, offers list
 */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id)
      return res.status(400).json({ error: "pub_id is required" });

    // 1) Fetch all tracking entries for this PUB_ID
    const q = `
      SELECT 
        publisher_name,
        geo,
        carrier,
        name AS offer_name,
        id AS offer_id,
        payout,
        landing_page_url
      FROM tracking
      WHERE pub_code = $1
    `;

    const result = await pool.query(q, [pub_id]);

    if (result.rows.length === 0)
      return res.status(404).json({
        error: "NO_TRACKING_FOUND",
        detail: `No tracking found for ${pub_id}`
      });

    // Unique GEO & Carriers
    const geos = [...new Set(result.rows.map(r => r.geo))];
    const carriers = [...new Set(result.rows.map(r => r.carrier))];

    res.json({
      pub_id,
      publisher_name: result.rows[0].publisher_name,
      geos,
      carriers,
      offers: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

export default router;
