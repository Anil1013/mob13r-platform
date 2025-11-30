import express from "express";
import pool from "../db.js";                 // ← CORRECT PATH
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* =====================================================
   GET META - FETCH PUBLISHER TRACKING INFO
===================================================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ success: false, message: "pub_id is required" });
    }

    // Fetch tracking row for this pub_id
    const trackRes = await pool.query(
      `
      SELECT 
        id AS tracking_id,
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
      LIMIT 1
      `,
      [pub_id]
    );

    if (trackRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Publisher tracking not found" });
    }

    const t = trackRes.rows[0];

    // Build default parameters
    const defaultParams = {
      click_id: "{click_id}",
      ua: "{ua}",
      msisdn: "{msisdn}"
    };

    const paramsString = Object.entries(defaultParams)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    // Append parameters to base tracking_url
    let finalUrl = t.tracking_url;
    finalUrl += finalUrl.includes("?") ? `&${paramsString}` : `?${paramsString}`;

    return res.json({
      success: true,
      meta: {
        pub_id: t.pub_id,
        publisher_name: t.publisher_name,
        geo: t.geo,
        carrier: t.carrier,
        type: t.type,
        base_tracking_url: t.tracking_url,
        final_tracking_url: finalUrl
      }
    });

  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error loading meta" });
  }
});

/* =====================================================
   GET ACTIVE OFFERS (YOU FILTER BY GEO + CARRIER)
===================================================== */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const { geo, carrier } = req.query;

    if (!geo || !carrier) {
      return res
        .status(400)
        .json({ success: false, message: "geo and carrier are required" });
    }

    const offerRes = await pool.query(
      `
      SELECT 
        offer_id,
        advertiser_name,
        name AS offer_name,
        tracking_url,
        cap_daily,
        cap_total,
        status,
        fallback_offer_id,
        is_fallback
      FROM offers
      WHERE status = 'active'
      `
    );

    return res.json({ success: true, offers: offerRes.rows });

  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ success: false, message: "Error loading offers" });
  }
});

/* =====================================================
   GET TRAFFIC RULES FOR PUB_ID
===================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const rules = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY weight DESC, id DESC
      `,
      [pub_id]
    );

    return res.json({ success: true, rules: rules.rows });

  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ success: false, message: "Server error fetching rules" });
  }
});

/* =====================================================
   CREATE RULE
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

    const insertRes = await pool.query(
      `
      INSERT INTO traffic_rules (
        pub_id, publisher_name, geo, carrier,
        offer_id, offer_name, advertiser_name,
        redirect_url, type, weight, status
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,
        $8,$9,$10,$11
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

    return res.json({ success: true, rule: insertRes.rows[0] });

  } catch (err) {
    console.error("CREATE RULE ERROR:", err);
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
    let idx = 1;

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${idx}`);
        values.push(req.body[f]);
        idx++;
      }
    }

    values.push(id);

    const updated = await pool.query(
      `UPDATE traffic_rules SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    return res.json({ success: true, rule: updated.rows[0] });

  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
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

    return res.json({ success: true, message: "Rule deleted" });

  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ success: false, message: "Error deleting rule" });
  }
});

/* =====================================================
   REMAINING WEIGHT CHECK
===================================================== */
router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const w = await pool.query(
      `
      SELECT COALESCE(SUM(weight),0) AS used
      FROM traffic_rules
      WHERE pub_id = $1
      `,
      [pub_id]
    );

    const used = parseInt(w.rows[0].used);
    const remaining = 100 - used;

    return res.json({
      success: true,
      used,
      remaining
    });

  } catch (err) {
    console.error("WEIGHT ERROR:", err);
    res.status(500).json({ success: false, message: "Error computing weight" });
  }
});

export default router;
