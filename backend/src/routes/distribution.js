// mob13r-platform/backend/src/routes/distribution.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   📌 META API — FRONTEND LOAD DATA
   Using: publisher_tracking_links + offers
====================================================== */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_code } = req.query;

    if (!pub_code) {
      return res.status(400).json({ error: "pub_code is required" });
    }

    // Publisher tracking rows for dropdown
    const PTLquery = `
      SELECT 
        id AS tracking_link_id,
        pub_code,
        publisher_name,
        name AS offer_name,
        geo,
        carrier,
        payout,
        cap_daily,
        cap_total,
        hold_percent,
        landing_page_url,
        tracking_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
    `;

    const offersQuery = `
      SELECT 
        offer_id,
        advertiser_name,
        name AS offer_name,
        tracking_url,
        is_fallback
      FROM offers 
      WHERE status = 'active'
    `;

    const [ptlRes, offersRes] = await Promise.all([
      pool.query(PTLquery, [pub_code]),
      pool.query(offersQuery)
    ]);

    return res.json({
      tracking_links: ptlRes.rows,
      offers: offersRes.rows
    });

  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: "Meta failed" });
  }
});

/* ======================================================
   📌 GET RULES — Distribution Rules for PUB + PTL
====================================================== */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_code, tracking_link_id } = req.query;

    if (!pub_code || !tracking_link_id) {
      return res.status(400).json({ error: "pub_code & tracking_link_id required" });
    }

    const query = `
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

    const rules = await pool.query(query, [pub_code, tracking_link_id]);

    res.json(rules.rows);

  } catch (err) {
    console.error("RULES ERROR:", err);
    return res.status(500).json({ error: "Rules fetch failed" });
  }
});

/* ======================================================
   📌 BULK UPDATE RULES
====================================================== */
router.post("/rules/bulk", authJWT, async (req, res) => {
  const { pub_code, tracking_link_id, rules } = req.body;

  if (!pub_code || !tracking_link_id || !Array.isArray(rules)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM distribution_rules WHERE pub_code = $1 AND tracking_link_id = $2`,
      [pub_code, tracking_link_id]
    );

    for (const r of rules) {
      await client.query(
        `
        INSERT INTO distribution_rules (pub_code, tracking_link_id, offer_id, weight)
        VALUES ($1, $2, $3, $4)
        `,
        [pub_code, tracking_link_id, r.offer_id, r.weight]
      );
    }

    await client.query("COMMIT");

    return res.json({ message: "Rules saved" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("BULK RULE ERROR:", err);
    res.status(500).json({ error: "Bulk update failed" });
  } finally {
    client.release();
  }
});

/* ======================================================
   📌 DELETE RULE
====================================================== */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(`DELETE FROM distribution_rules WHERE id = $1`, [
      req.params.id
    ]);

    res.json({ message: "Rule deleted" });

  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: "Rule delete failed" });
  }
});

/* ======================================================
   📌 MAIN DISTRIBUTION LOGIC — CLICK REDIRECTION
====================================================== */
export async function pickOfferForDistribution({ pub_code, geo, carrier }) {
  try {
    // Match PTL entry
    const ptlRes = await pool.query(
      `
      SELECT id AS tracking_link_id
      FROM publisher_tracking_links
      WHERE pub_code = $1 AND geo = $2 AND carrier = $3
      LIMIT 1
      `,
      [pub_code, geo, carrier]
    );

    if (!ptlRes.rows.length) return null; // fallback

    const tracking_link_id = ptlRes.rows[0].tracking_link_id;

    // Load rules
    const rulesRes = await pool.query(
      `SELECT offer_id, weight FROM distribution_rules WHERE tracking_link_id = $1`,
      [tracking_link_id]
    );

    if (!rulesRes.rows.length) return null;

    const rules = rulesRes.rows;
    const totalWeight = rules.reduce((t, r) => t + Number(r.weight), 0);

    // Weighted random selection
    const rand = Math.random() * totalWeight;
    let cumulative = 0;
    let selectedOffer = rules[0].offer_id;

    for (const r of rules) {
      cumulative += Number(r.weight);
      if (rand <= cumulative) {
        selectedOffer = r.offer_id;
        break;
      }
    }

    return {
      offerId: selectedOffer,
      tracking_link_id,
      isFromDistribution: true
    };

  } catch (err) {
    console.error("DISTRIBUTION LOGIC ERROR:", err);
    return null;
  }
}

export default router;
