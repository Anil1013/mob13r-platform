// mob13r-platform/backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ============================================
   GET META DETAILS FOR FRONTEND
   - Publisher info
   - Publisher tracking links (publisher_tracking_links)
   - Active offers
===============================================*/
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query; // e.g. "PUB01"

    if (!pub_id) {
      return res.status(400).json({ error: "pub_id is required" });
    }

    // 1) Publisher basic info
    const publisherQuery = `
      SELECT pub_id, publisher_name 
      FROM publishers 
      WHERE pub_id = $1
    `;

    // 2) Publisher Tracking Links (this replaces old tracking table)
    const trackingQuery = `
      SELECT 
        id AS tracking_link_id,
        pub_code       AS pub_id,
        publisher_id,
        publisher_name,
        name,
        geo,
        carrier,
        type,
        payout,
        cap_daily,
        cap_total,
        hold_percent,
        landing_page_url,
        tracking_url,
        pin_send_url,
        pin_verify_url,
        check_status_url,
        portal_url,
        status,
        created_at,
        updated_at
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;

    // 3) Active offers for distribution
    const offerQuery = `
      SELECT 
        offer_id,
        name AS offer_name,
        advertiser_name,
        type,
        payout,
        tracking_url,
        cap_daily,
        cap_total,
        status
      FROM offers
      WHERE status = 'active'
      ORDER BY id ASC
    `;

    const [publisherRes, trackingRes, offerRes] = await Promise.all([
      pool.query(publisherQuery, [pub_id]),
      pool.query(trackingQuery, [pub_id]),
      pool.query(offerQuery),
    ]);

    return res.json({
      publisher: publisherRes.rows[0] || null,
      tracking: trackingRes.rows,
      offers: offerRes.rows,
    });
  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: "meta failed" });
  }
});

/* ============================================
   GET DISTRIBUTION RULES (WEIGHTED)
   For given pub_id + tracking_link_id
===============================================*/
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res.status(400).json({ error: "pub_id & tracking_link_id needed" });
    }

    const query = `
      SELECT 
        r.id,
        r.pub_id,
        r.tracking_link_id,
        r.offer_id,
        r.weight,
        o.name AS offer_name,
        o.advertiser_name,
        ptl.geo,
        ptl.carrier
      FROM distribution_rules r
      LEFT JOIN offers o 
        ON o.offer_id = r.offer_id
      LEFT JOIN publisher_tracking_links ptl
        ON ptl.id = r.tracking_link_id
      WHERE 
        r.pub_id = $1 
        AND r.tracking_link_id = $2
      ORDER BY r.id ASC
    `;

    const rules = await pool.query(query, [pub_id, tracking_link_id]);

    return res.json(rules.rows);
  } catch (err) {
    console.error("RULES ERROR:", err);
    return res.status(500).json({ error: "rules failed" });
  }
});

/* ============================================
   BULK UPDATE RULES
   Body: { pub_id, tracking_link_id, rules: [{offer_id, weight}, ...] }
===============================================*/
router.post("/rules/bulk", authJWT, async (req, res) => {
  const { pub_id, tracking_link_id, rules } = req.body;

  if (!pub_id || !tracking_link_id || !Array.isArray(rules)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clear existing rules for this pub + tracking link
    await client.query(
      `DELETE FROM distribution_rules WHERE pub_id = $1 AND tracking_link_id = $2`,
      [pub_id, tracking_link_id]
    );

    // Insert all rules
    for (const r of rules) {
      if (!r.offer_id || r.weight == null) continue;

      await client.query(
        `
          INSERT INTO distribution_rules (pub_id, tracking_link_id, offer_id, weight)
          VALUES ($1, $2, $3, $4)
        `,
        [pub_id, tracking_link_id, r.offer_id, r.weight]
      );
    }

    await client.query("COMMIT");

    return res.json({ message: "Rules updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("BULK RULE ERROR:", err);
    return res.status(500).json({ error: "bulk rule fail" });
  } finally {
    client.release();
  }
});

/* ============================================
   DELETE SINGLE RULE BY ID
===============================================*/
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM distribution_rules WHERE id = $1`,
      [req.params.id]
    );

    return res.json({ message: "Rule deleted" });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    return res.status(500).json({ error: "delete failed" });
  }
});

/* =====================================================
   🧠 PICK OFFER FOR CLICK REDIRECTION (DISTRIBUTION LOGIC)
   Input: { pubId, geo, carrier }
   - Picks matching distribution_meta row (cap/remaining)
   - Uses distribution_rules weights for that tracking_link_id
   - Decrements remaining_hit, increments total_hit
   - Returns { offerId, tracking_link_id, isFromDistribution }
=======================================================*/
export async function pickOfferForDistribution({ pubId, geo, carrier }) {
  try {
    // 1) Find a distribution_meta row which still has remaining_hit
    const metaRes = await pool.query(
      `
        SELECT 
          m.id,
          m.pub_id,
          m.tracking_link_id,
          m.remaining_hit
        FROM distribution_meta m
        JOIN publisher_tracking_links ptl 
          ON ptl.id = m.tracking_link_id
        WHERE 
          m.pub_id = $1
          AND m.remaining_hit > 0
          AND ptl.geo = $2
          AND ptl.carrier = $3
        LIMIT 1
      `,
      [pubId, geo, carrier]
    );

    if (!metaRes.rows.length) {
      // No distribution meta found (either no cap or mapping)
      return null;
    }

    const meta = metaRes.rows[0];

    // 2) Get all weighted rules for this tracking_link_id
    const rulesRes = await pool.query(
      `
        SELECT offer_id, weight 
        FROM distribution_rules 
        WHERE tracking_link_id = $1
      `,
      [meta.tracking_link_id]
    );

    if (!rulesRes.rows.length) {
      // No rules defined for this link
      return null;
    }

    const rules = rulesRes.rows;

    // 3) Weighted random selection
    const totalWeight = rules.reduce(
      (sum, r) => sum + Number(r.weight || 0),
      0
    );

    if (totalWeight <= 0) {
      return null;
    }

    const random = Math.random() * totalWeight;
    let cumulative = 0;
    let selectedOffer = rules[0].offer_id;

    for (const r of rules) {
      cumulative += Number(r.weight || 0);
      if (random <= cumulative) {
        selectedOffer = r.offer_id;
        break;
      }
    }

    // 4) Update meta counters (consume 1 hit)
    await pool.query(
      `
        UPDATE distribution_meta 
        SET 
          remaining_hit = GREATEST(remaining_hit - 1, 0),
          total_hit = total_hit + 1,
          updated_at = now()
        WHERE id = $1
      `,
      [meta.id]
    );

    // 5) Return selection
    return {
      offerId: selectedOffer,
      tracking_link_id: meta.tracking_link_id,
      isFromDistribution: true,
    };
  } catch (err) {
    console.error("DISTRIBUTION PICK ERROR:", err);
    return null;
  }
}

export default router;
