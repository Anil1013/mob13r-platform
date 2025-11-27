import express from "express";
import pool from "../db.js";

const router = express.Router();

/* ===================================================
   1. Fetch Publisher Distribution Rules
   =================================================== */
const getDistributionRules = async (pub_id, geo, carrier) => {
  const [rows] = await pool.query(
    `
    SELECT 
      id, offer_id, percentage, sequence_order
    FROM publisher_distributions
    WHERE pub_id = ?
      AND (geo = ? OR geo IS NULL OR geo = '')
      AND (carrier = ? OR carrier IS NULL OR carrier = '')
    ORDER BY sequence_order ASC
    `,
    [pub_id, geo, carrier]
  );

  return rows;
};

/* ===================================================
   2. Weighted Random Offer Selection
   =================================================== */
const pickOffer = (rules) => {
  let weighted = [];

  rules.forEach((r) => {
    for (let i = 0; i < r.percentage; i++) {
      weighted.push(r.offer_id);
    }
  });

  if (weighted.length === 0) return null;

  const index = Math.floor(Math.random() * weighted.length);
  return weighted[index];
};

/* ===================================================
   3. MAIN REDIRECTION ROUTE  (Single File System)
   =================================================== */

router.get("/redirect/:tracking_key", async (req, res) => {
  try {
    const { tracking_key } = req.params;

    const ip = req.ip;
    const ua = req.headers["user-agent"] ?? "";

    /* 1. Resolve Publisher Tracking Link */
    const [[link]] = await pool.query(
      `
      SELECT id, pub_id, geo, carrier 
      FROM publisher_tracking_links
      WHERE tracking_link_id = ?
      `,
      [tracking_key]
    );

    if (!link) return res.status(404).send("Invalid Tracking Link");

    /* 2. Fetch Distribution Rules */
    const rules = await getDistributionRules(link.pub_id, link.geo, link.carrier);

    if (rules.length === 0) {
      return res.status(500).send("No Distribution Rules Found");
    }

    /* 3. Weighted Offer Pick */
    let offerId = pickOffer(rules);
    if (!offerId) offerId = rules[0].offer_id;

    /* 4. Get Offer URL */
    const [[offer]] = await pool.query(
      `
      SELECT tracking_url, fallback_offer_id, is_fallback
      FROM offers
      WHERE id = ?
      `,
      [offerId]
    );

    let redirectUrl = offer?.tracking_url;

    /* 5. Fallback Handling */
    if (!redirectUrl) {
      const fallbackId = offer?.fallback_offer_id || rules[0].offer_id;

      const [[fallback]] = await pool.query(
        `SELECT tracking_url FROM offers WHERE id = ?`,
        [fallbackId]
      );

      redirectUrl = fallback?.tracking_url ?? "https://google.com";
    }

    /* 6. Save Analytics Click */
    await pool.query(
      `
      INSERT INTO analytics_clicks (partner_id, ip, user_agent, redirect_url)
      VALUES (?, ?, ?, ?)
      `,
      [offerId, ip, ua, redirectUrl]
    );

    /* 7. Redirect */
    return res.redirect(redirectUrl);

  } catch (err) {
    console.error("Redirect Error:", err);
    return res.status(500).send("Internal Server Error");
  }
});

/* ===================================================
   EXPORT ROUTER
   =================================================== */
export default router;
