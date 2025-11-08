import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* Helper: Generate OFF IDs (OFF1001, OFF1002...) */
const generateOfferId = async () => {
  const prefix = "OFF";
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM offers");
  const next = rows[0].count + 1001;
  return `${prefix}${next}`;
};

/* ======================
   GET ALL OFFERS
====================== */
router.get("/", authJWT, async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT o.*, t.template_name
      FROM offers o
      LEFT JOIN offer_templates t ON o.inapp_template_id = t.id
      ORDER BY o.id DESC
    `);
    res.json(q.rows);
  } catch (err) {
    console.error("GET /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   GET ADVERTISERS LIST
====================== */
router.get("/advertisers", authJWT, async (req, res) => {
  try {
    const q = await pool.query(`
      SELECT name FROM advertisers
      WHERE status = 'active'
      ORDER BY name ASC
    `);
    res.json(q.rows);
  } catch (err) {
    console.error("GET advertisers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   CREATE OFFER
====================== */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      advertiser_name,
      name,
      type,
      payout,
      tracking_url,
      cap_daily,
      cap_total,
      status,
      targets,
      fallback_offer_id,
      inapp_template_id,
      inapp_config
    } = req.body;

    if (!advertiser_name) return res.status(400).json({ error: "Advertiser name is required" });

    if (["CPA", "CPI", "CPL", "CPS"].includes(type) && !tracking_url)
      return res.status(400).json({ error: `${type} offers need tracking_url` });

    if (type === "INAPP" && !inapp_template_id && !inapp_config)
      return res.status(400).json({ error: "INAPP requires template or JSON config" });

    const offer_id = await generateOfferId();

    const q = await pool.query(
      `INSERT INTO offers (
         offer_id, advertiser_name, name, type, payout, tracking_url,
         cap_daily, cap_total, status, fallback_offer_id,
         inapp_template_id, inapp_config, created_at, updated_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
       RETURNING *`,
      [
        offer_id, advertiser_name, name, type, payout, tracking_url,
        cap_daily, cap_total, status || "active", fallback_offer_id || null,
        inapp_template_id || null,
        inapp_config ? JSON.stringify(inapp_config) : null
      ]
    );

    if (Array.isArray(targets)) {
      for (const t of targets) {
        await pool.query(
          "INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3)",
          [offer_id, t.geo, t.carrier || null]
        );
      }
    }

    res.status(201).json(q.rows[0]);
  } catch (err) {
    console.error("POST /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   UPDATE OFFER
====================== */
router.put("/:offer_id", authJWT, async (req, res) => {
  try {
    const { offer_id } = req.params;
    const {
      advertiser_name,
      name,
      type,
      payout,
      tracking_url,
      cap_daily,
      cap_total,
      status,
      fallback_offer_id,
      inapp_template_id,
      inapp_config,
      targets
    } = req.body;

    const q = await pool.query(
      `UPDATE offers
       SET advertiser_name=$1, name=$2, type=$3, payout=$4, tracking_url=$5,
           cap_daily=$6, cap_total=$7, status=$8, fallback_offer_id=$9,
           inapp_template_id=$10, inapp_config=$11, updated_at=NOW()
       WHERE offer_id=$12 RETURNING *`,
      [
        advertiser_name, name, type, payout, tracking_url, cap_daily, cap_total,
        status, fallback_offer_id, inapp_template_id || null,
        inapp_config ? JSON.stringify(inapp_config) : null, offer_id
      ]
    );

    await pool.query("DELETE FROM offer_targets WHERE offer_id=$1", [offer_id]);
    for (const t of targets || []) {
      await pool.query(
        "INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3)",
        [offer_id, t.geo, t.carrier || null]
      );
    }

    res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
