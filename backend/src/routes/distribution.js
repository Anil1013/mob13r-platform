// mob13r-platform/backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
    GET META FOR TRAFFIC DISTRIBUTION PAGE
======================================================*/
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ error: "pub_id is required" });
    }

    // 👉 ALL DATA WILL COME FROM publisher_tracking_links ONLY
    const trackingQuery = `
      SELECT 
        id AS tracking_link_id,
        pub_code AS pub_id,
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
        is_fallback,
        status
      FROM offers
      WHERE status = 'active'
      ORDER BY id ASC
    `;

    const [trackingRes, offerRes] = await Promise.all([
      pool.query(trackingQuery, [pub_id]),
      pool.query(offerQuery),
    ]);

    return res.json({
      tracking: trackingRes.rows,
      offers: offerRes.rows,
    });
  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: "meta failed" });
  }
});

/* ======================================================
    GET ALL RULES FOR A SPECIFIC TRACKING LINK
======================================================*/
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id || !tracking_link_id) {
      return res.status(400).json({ error: "pub_id & tracking_link_id are required" });
    }

    const rulesQuery = `
      SELECT 
        r.id,
        r.pub_id,
        r.tracking_link_id,
        r.offer_id,
        r.weight,
        o.name AS offer_name,
        o.advertiser_name
      FROM distribution_rules r
      LEFT JOIN offers o ON o.offer_id = r.offer_id
      WHERE r.pub_id = $1 AND r.tracking_link_id = $2
      ORDER BY r.id ASC
    `;

    const rules = await pool.query(rulesQuery, [pub_id, tracking_link_id]);

    return res.json(rules.rows);
  } catch (err) {
    console.error("RULES ERROR:", err);
    return res.status(500).json({ error: "rules failed" });
  }
});

/* ======================================================
    BULK UPDATE RULES FOR A TRACKING LINK
======================================================*/
router.post("/rules/bulk", authJWT, async (req, res) => {
  const { pub_id, tracking_link_id, rules } = req.body;

  if (!pub_id || !tracking_link_id || !rules) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Remove old rules
    await client.query(
      `DELETE FROM distribution_rules WHERE pub_id=$1 AND tracking_link_id=$2`,
      [pub_id, tracking_link_id]
    );

    // Insert new rules
    for (const r of rules) {
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

/* ======================================================
    DELETE A RULE
======================================================*/
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(`DELETE FROM distribution_rules WHERE id=$1`, [req.params.id]);
    return res.json({ message: "Rule deleted" });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    return res.status(500).json({ error: "delete failed" });
  }
});

/* ======================================================
    DISTRIBUTION LOGIC (WEIGHTED + FALLBACK)
======================================================*/
export async function pickOfferForDistribution({ pubId, geo, carrier }) {
  try {
    // 1️⃣ Get a matching tracking link (publisher)
    const trackingRes = await pool.query(
      `
      SELECT id AS tracking_link_id
      FROM publisher_tracking_links
      WHERE pub_code=$1 AND geo=$2 AND carrier=$3
      LIMIT 1
      `,
      [pubId, geo, carrier]
    );

    if (!trackingRes.rows.length) {
      console.log("❌ No tracking link found → fallback offer will be used");
      return null;
    }

    const trackingLinkId = trackingRes.rows[0].tracking_link_id;

    // 2️⃣ Get distribution rules for this tracking link
    const ruleRes = await pool.query(
      `SELECT offer_id, weight FROM distribution_rules WHERE tracking_link_id=$1`,
      [trackingLinkId]
    );

    let rules = ruleRes.rows;

    // No rules → Use fallback offer
    if (!rules.length) {
      const fb = await getFallbackOffer(geo, carrier);
      return fb;
    }

    // 3️⃣ Weighted Random Selection
    const totalWeight = rules.reduce((a, b) => a + Number(b.weight), 0);
    const random = Math.random() * totalWeight;
    let cumulative = 0;

    let selectedOffer = rules[0].offer_id;

    for (const r of rules) {
      cumulative += Number(r.weight);
      if (random <= cumulative) {
        selectedOffer = r.offer_id;
        break;
      }
    }

    return {
      offerId: selectedOffer,
      tracking_link_id: trackingLinkId,
      isFromDistribution: true,
    };
  } catch (err) {
    console.error("DISTRIBUTION ERROR:", err);
    return null;
  }
}

/* ======================================================
    FALLBACK OFFER IF NO RULES MATCH
======================================================*/
async function getFallbackOffer(geo, carrier) {
  try {
    const fb = await pool.query(
      `SELECT offer_id FROM offers 
       WHERE is_fallback = true 
       ORDER BY id DESC LIMIT 1`
    );

    if (fb.rows.length) {
      return { offerId: fb.rows[0].offer_id, isFallback: true };
    }

    return null;
  } catch (err) {
    console.error("FALLBACK ERROR:", err);
    return null;
  }
}

export default router;
