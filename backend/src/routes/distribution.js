// mob13r-platform/backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ============================================
   GET META DETAILS FOR FRONTEND
===============================================*/
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ error: "pub_id is required" });
    }

    const publisherQuery = `
      SELECT pub_id, publisher_name 
      FROM publishers 
      WHERE pub_id = $1
    `;

    const trackingQuery = `
      SELECT id AS tracking_link_id, pub_id, geo, carrier, url 
      FROM tracking 
      WHERE pub_id = $1
    `;

    const offerQuery = `
      SELECT offer_id, name AS offer_name, advertiser_name, cap, geo, carrier 
      FROM offers
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
        t.geo,
        t.carrier
      FROM distribution_rules r
      LEFT JOIN offers o ON o.offer_id = r.offer_id
      LEFT JOIN tracking t ON t.id = r.tracking_link_id
      WHERE r.pub_id = $1 AND r.tracking_link_id = $2
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
===============================================*/
router.post("/rules/bulk", authJWT, async (req, res) => {
  const { pub_id, tracking_link_id, rules } = req.body;

  if (!pub_id || !tracking_link_id || !rules) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM distribution_rules WHERE pub_id=$1 AND tracking_link_id=$2`,
      [pub_id, tracking_link_id]
    );

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

/* ============================================
   DELETE RULE
===============================================*/
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM distribution_rules WHERE id=$1`,
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
=======================================================*/
export async function pickOfferForDistribution({ pubId, geo, carrier }) {
  try {
    const metaRes = await pool.query(
      `
      SELECT m.id, m.pub_id, m.tracking_link_id, m.remaining_hit
      FROM distribution_meta m
      JOIN tracking t ON t.id = m.tracking_link_id
      WHERE 
        m.pub_id = $1 AND 
        m.remaining_hit > 0 AND 
        t.geo = $2 AND 
        t.carrier = $3
      LIMIT 1
      `,
      [pubId, geo, carrier]
    );

    if (!metaRes.rows.length) return null; // fallback

    const meta = metaRes.rows[0];

    const rulesRes = await pool.query(
      `SELECT offer_id, weight FROM distribution_rules WHERE tracking_link_id=$1`,
      [meta.tracking_link_id]
    );

    if (!rulesRes.rows.length) return null;

    const rules = rulesRes.rows;
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

    await pool.query(
      `
      UPDATE distribution_meta 
      SET 
        remaining_hit = GREATEST(remaining_hit - 1, 0),
        total_hit = total_hit + 1,
        updated_at = now()
      WHERE id=$1
    `,
      [meta.id]
    );

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
