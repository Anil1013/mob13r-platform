import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* =====================================================
   GET META FOR TRAFFIC DISTRIBUTION (publisher + tracking)
===================================================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) return res.status(400).json({ success: false, message: "pub_id required" });

    // Get tracking data for this pub_id
    const trackRes = await pool.query(
      `
      SELECT 
        pub_id,
        publisher_id,
        publisher_name,
        geo,
        carrier,
        type,
        tracking_url,
        cap_daily,
        cap_total,
        hold_percent
      FROM tracking
      WHERE pub_id = $1
      `,
      [pub_id]
    );

    if (trackRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Publisher not found!" });
    }

    const tracking = trackRes.rows[0];

    // Default parameters sample
    const defaultParams = {
      click_id: "{click_id}",
      ua: "{ua}",
      msisdn: "{msisdn}"
    };

    // Append default parameters to tracking URL (DO NOT encode)
    let formattedTrackingURL = tracking.tracking_url;
    const queryString = Object.keys(defaultParams)
      .map(k => `${k}=${defaultParams[k]}`)
      .join("&");

    if (formattedTrackingURL.includes("?")) {
      formattedTrackingURL += "&" + queryString;
    } else {
      formattedTrackingURL += "?" + queryString;
    }

    tracking.tracking_url = formattedTrackingURL;

    return res.json({
      success: true,
      meta: tracking
    });

  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ success: false, message: "Server error loading meta" });
  }
});

/* =====================================================
   GET ACTIVE OFFERS FOR THIS GEO + CARRIER
===================================================== */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const { geo, carrier } = req.query;

    if (!geo || !carrier)
      return res.status(400).json({ success: false, message: "geo and carrier required" });

    const offersRes = await pool.query(
      `
      SELECT 
        offer_id,
        advertiser_name,
        name AS offer_name,
        tracking_url,
        cap_daily,
        cap_total,
        status,
        is_fallback
      FROM offers
      WHERE status = 'active'
      `
    );

    // Filter by GEO + CARRIER using offer_id logic
    // (future: if you create mapping table then join directly)
    const activeOffers = offersRes.rows;

    return res.json({
      success: true,
      offers: activeOffers
    });

  } catch (err) {
    console.error("OFFERS FETCH ERROR:", err);
    res.status(500).json({ success: false, message: "Server error fetching offers" });
  }
});

/* =====================================================
   GET ALL TRAFFIC RULES FOR THIS PUB_ID + TRACKING LINK
===================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const result = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY weight DESC, id DESC
      `,
      [pub_id]
    );

    res.json({ success: true, rules: result.rows });

  } catch (err) {
    console.error("RULES FETCH ERROR:", err);
    res.status(500).json({ success: false, message: "Error fetching rules" });
  }
});

/* =====================================================
   CREATE TRAFFIC RULE
===================================================== */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const {
      pub_id,
      publisher_name,
      geo,
      carrier,
      offer_id,
      offer_name,
      advertiser_name,
      redirect_url,
      type,
      weight,
      status
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO traffic_rules (
        pub_id, publisher_name, geo, carrier, 
        offer_id, offer_name, advertiser_name,
        redirect_url, type, weight, status, created_by
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,$10,$11,1
      )
      RETURNING *
      `,
      [
        pub_id,
        publisher_name,
        geo,
        carrier,
        offer_id,
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status
      ]
    );

    res.json({ success: true, rule: result.rows[0] });

  } catch (err) {
    console.error("RULE CREATE ERROR:", err);
    res.status(500).json({ success: false, message: "Error creating rule" });
  }
});

/* =====================================================
   UPDATE RULE
===================================================== */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const fields = [
      "geo",
      "carrier",
      "offer_id",
      "offer_name",
      "advertiser_name",
      "redirect_url",
      "type",
      "weight",
      "status"
    ];

    const updates = [];
    const values = [];
    let index = 1;

    for (let field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${index}`);
        values.push(req.body[field]);
        index++;
      }
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE traffic_rules SET ${updates.join(", ")}
       WHERE id = $${index}
       RETURNING *`,
      values
    );

    res.json({ success: true, rule: result.rows[0] });

  } catch (err) {
    console.error("RULE UPDATE ERROR:", err);
    res.status(500).json({ success: false, message: "Error updating rule" });
  }
});

/* =====================================================
   DELETE RULE
===================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [id]);

    res.json({ success: true, message: "Rule deleted" });

  } catch (err) {
    console.error("RULE DELETE ERROR:", err);
    res.status(500).json({ success: false, message: "Error deleting rule" });
  }
});

/* =====================================================
   CHECK REMAINING WEIGHT
===================================================== */
router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const result = await pool.query(
      `
      SELECT COALESCE(SUM(weight),0) AS total_weight
      FROM traffic_rules
      WHERE pub_id = $1
      `,
      [pub_id]
    );

    const used = parseInt(result.rows[0].total_weight);
    const remaining = 100 - used;

    res.json({
      success: true,
      used,
      remaining
    });

  } catch (err) {
    console.error("WEIGHT CHECK ERROR:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
