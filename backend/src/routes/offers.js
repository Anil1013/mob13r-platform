import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* Helper: generate offer_id */
const generateOfferId = async () => {
  const prefix = "OFF";
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM offers");
  const next = rows[0].count + 1001; // starts from 1001
  return `${prefix}${next}`;
};

/* 🟢 Get all offers */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, a.name AS advertiser_name
      FROM offers o
      LEFT JOIN advertisers a ON o.advertiser_id = a.id
      ORDER BY o.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* 🟢 Get advertisers for dropdown */
router.get("/advertisers", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name FROM advertisers ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    console.error("GET /offers/advertisers error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* 🟡 Create offer */
router.post("/", authJWT, async (req, res) => {
  try {
    const { advertiser_id, name, type, payout, tracking_url, cap_daily, cap_total, status, targets } = req.body;
    const offer_id = await generateOfferId();

    const q = await pool.query(
      `INSERT INTO offers (offer_id, advertiser_id, name, type, payout, tracking_url, cap_daily, cap_total, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [offer_id, advertiser_id, name, type, payout, tracking_url, cap_daily, cap_total, status || "active"]
    );

    if (Array.isArray(targets) && targets.length) {
      for (const t of targets) {
        await pool.query(
          "INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
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

/* 🟣 Update offer */
router.put("/:offer_id", authJWT, async (req, res) => {
  try {
    const { offer_id } = req.params;
    const { name, type, payout, tracking_url, cap_daily, cap_total, status, targets } = req.body;

    const q = await pool.query(
      `UPDATE offers
       SET name=$1, type=$2, payout=$3, tracking_url=$4, cap_daily=$5, cap_total=$6, status=$7, updated_at=NOW()
       WHERE offer_id=$8 RETURNING *`,
      [name, type, payout, tracking_url, cap_daily, cap_total, status, offer_id]
    );

    if (q.rows.length === 0)
      return res.status(404).json({ error: "Offer not found" });

    if (Array.isArray(targets)) {
      await pool.query("DELETE FROM offer_targets WHERE offer_id=$1", [offer_id]);
      for (const t of targets) {
        await pool.query(
          "INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3)",
          [offer_id, t.geo, t.carrier]
        );
      }
    }

    res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /offers/:offer_id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
