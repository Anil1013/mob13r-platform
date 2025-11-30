// mob13r-platform/backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   🟢 GET DISTRIBUTION META (Publisher + Offers)
   ====================================================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id || pub_id.trim() === "") {
      return res.status(400).json({ error: "pub_id is required" });
    }

    /* ---------------------------------------------------------
       FETCH PUBLISHER SIDE DATA FROM publisher_tracking_links
       --------------------------------------------------------- */
    const trackingQuery = `
      SELECT
        id AS tracking_link_id,
        pub_code,
        publisher_id,
        publisher_name,
        name AS tracking_name,
        geo,
        carrier,
        type,
        payout,
        cap_daily,
        cap_total,
        hold_percent,
        landing_page,
        tracking_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
    `;

    const trackingRes = await pool.query(trackingQuery, [pub_id]);

    /* ---------------------------------------------------------
       FETCH ADVERTISER SIDE OFFERS FROM offers TABLE
       --------------------------------------------------------- */
    const offersQuery = `
      SELECT
        offer_id,
        name AS offer_name,
        advertiser_id,
        advertiser_name,
        country AS geo,
        carrier,
        payout,
        cap_daily,
        cap_total,
        status,
        fallback_offer_id
      FROM offers
      ORDER BY id DESC
    `;

    const offersRes = await pool.query(offersQuery);

    return res.json({
      pub_code: pub_id,
      tracking: trackingRes.rows,
      offers: offersRes.rows,
    });

  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟡 GET ALL RULES FOR PUB + TRACKING LINK
   ====================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res.status(400).json({ error: "pub_id & tracking_link_id required" });
    }

    const ruleQuery = `
      SELECT
        r.id,
        r.pub_code,
        r.tracking_link_id,
        r.offer_id,
        r.weight,
        o.name AS offer_name,
        o.advertiser_name
      FROM distribution_rules r
      LEFT JOIN offers o ON o.offer_id = r.offer_id
      WHERE r.pub_code = $1 AND r.tracking_link_id = $2
      ORDER BY r.id ASC
    `;

    const rulesRes = await pool.query(ruleQuery, [pub_id, tracking_link_id]);

    return res.json(rulesRes.rows);

  } catch (err) {
    console.error("RULE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟠 BULK UPDATE RULES
   ====================================================== */
router.post("/rules/bulk", authJWT, async (req, res) => {
  const pub_code = req.body.pub_id;
  const { tracking_link_id, rules } = req.body;

  if (!pub_code || !tracking_link_id || !rules) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM distribution_rules WHERE pub_code=$1 AND tracking_link_id=$2`,
      [pub_code, tracking_link_id]
    );

    for (const r of rules) {
      await client.query(
        `
          INSERT INTO distribution_rules
          (pub_code, tracking_link_id, offer_id, weight)
          VALUES ($1, $2, $3, $4)
        `,
        [pub_code, tracking_link_id, r.offer_id, r.weight]
      );
    }

    await client.query("COMMIT");

    return res.json({ message: "Rules updated successfully" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("BULK RULE ERROR:", err);
    return res.status(500).json({ error: err.message });

  } finally {
    client.release();
  }
});

/* ======================================================
   🔴 DELETE RULE
   ====================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM distribution_rules WHERE id=$1`,
      [req.params.id]
    );

    return res.json({ message: "Rule deleted" });

  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
