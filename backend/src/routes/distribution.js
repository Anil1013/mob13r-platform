import express from "express";
import pool from "../db.js";

const router = express.Router();

/* ===================================================
   FETCH DISTRIBUTION RULES (weighted)
   =================================================== */
const getDistributionRules = async (pub_id, geo, carrier) => {
  const [rows] = await pool.query(
    `
    SELECT id, offer_id, percentage, sequence_order
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
   API ENDPOINTS FOR FRONTEND DASHBOARD
   =================================================== */

/* 1. OVERVIEW (publisher list + counts) */
router.get("/overview", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT pub_id, COUNT(*) AS rules
      FROM publisher_distributions
      GROUP BY pub_id
      ORDER BY pub_id ASC
      `
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 2. META (geo + carrier dropdowns) */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const [geos] = await pool.query(
      `SELECT DISTINCT geo FROM publisher_distributions WHERE pub_id = ?`,
      [pub_id]
    );

    const [carriers] = await pool.query(
      `SELECT DISTINCT carrier FROM publisher_distributions WHERE pub_id = ?`,
      [pub_id]
    );

    res.json({
      success: true,
      data: {
        geos: geos.map((g) => g.geo),
        carriers: carriers.map((c) => c.carrier),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 3. Rule List by Publisher */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const [rows] = await pool.query(
      `
      SELECT * 
      FROM publisher_distributions
      WHERE pub_id = ?
      ORDER BY sequence_order ASC
      `,
      [pub_id]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 4. Remaining % for a publisher GEO + Carrier */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;

    const [rows] = await pool.query(
      `
      SELECT COALESCE(SUM(percentage), 0) AS used
      FROM publisher_distributions
      WHERE pub_id = ?
        AND (geo = ? OR geo IS NULL OR geo = '')
        AND (carrier = ? OR carrier IS NULL OR carrier = '')
      `,
      [pub_id, geo, carrier]
    );

    const used = rows[0]?.used || 0;
    const remaining = 100 - used;

    res.json({ success: true, remaining });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 5. Create Rule */
router.post("/rules/create", async (req, res) => {
  try {
    const { pub_id, geo, carrier, offer_id, percentage, sequence_order } =
      req.body;

    if (!pub_id || !offer_id || !percentage) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await pool.query(
      `
      INSERT INTO publisher_distributions 
      (pub_id, geo, carrier, offer_id, percentage, sequence_order)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [pub_id, geo, carrier, offer_id, percentage, sequence_order]
    );

    res.json({ success: true, message: "Rule created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===================================================
   MAIN REDIRECT ENGINE
   =================================================== */
router.get("/redirect/:tracking_key", async (req, res) => {
  try {
    const { tracking_key } = req.params;
    const ip = req.ip;
    const ua = req.headers["user-agent"] ?? "";

    /* Step 1: Identify Publisher */
    const [[link]] = await pool.query(
      `
      SELECT pub_id, geo, carrier
      FROM publisher_tracking_links
      WHERE tracking_link_id = ?
      `,
      [tracking_key]
    );

    if (!link) return res.status(404).send("Invalid Link");

    /* Step 2: Get rules */
    const rules = await getDistributionRules(
      link.pub_id,
      link.geo,
      link.carrier
    );

    if (!rules.length) {
      return res.status(500).send("No Distribution Found");
    }

    /* Step 3: Weighted Pick */
    let offerId = pickOffer(rules);
    if (!offerId) offerId = rules[0].offer_id;

    /* Step 4: Get Offer URL */
    const [[offer]] = await pool.query(
      `
      SELECT tracking_url, fallback_offer_id 
      FROM offers
      WHERE id = ?
      `,
      [offerId]
    );

    let redirectUrl = offer?.tracking_url;

    /* Step 5: Fallback */
    if (!redirectUrl) {
      const fb = offer?.fallback_offer_id || rules[0].offer_id;
      const [[fallback]] = await pool.query(
        `SELECT tracking_url FROM offers WHERE id = ?`,
        [fb]
      );
      redirectUrl = fallback?.tracking_url || "https://google.com";
    }

    /* Step 6: Analytics */
    await pool.query(
      `
      INSERT INTO analytics_clicks (partner_id, ip, user_agent, redirect_url)
      VALUES (?, ?, ?, ?)
      `,
      [offerId, ip, ua, redirectUrl]
    );

    res.redirect(redirectUrl);
  } catch (err) {
    console.error("REDIRECT ERROR:", err);
    res.status(500).send("Internal Server Error");
  }
});

/* ===================================================
   EXPORT ROUTER
   =================================================== */
export default router;
