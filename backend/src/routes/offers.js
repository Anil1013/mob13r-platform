import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

// Helper: Generate sequential offer IDs
const generateOfferId = async () => {
  const prefix = "OFF";
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM offers");
  const next = rows[0].count + 1;
  return `${prefix}${String(next).padStart(2, "0")}`; // OFF01, OFF02, etc.
};

// 🟢 Get all offers (with targets + template name)
router.get("/", authJWT, async (req, res) => {
  try {
    const offersQuery = `
      SELECT o.*, t.template_name
      FROM offers o
      LEFT JOIN offer_templates t ON o.inapp_template_id = t.id
      ORDER BY o.id DESC
    `;
    const offersRes = await pool.query(offersQuery);

    const targetsRes = await pool.query("SELECT * FROM offer_targets");
    const targetsMap = {};
    targetsRes.rows.forEach((t) => {
      if (!targetsMap[t.offer_id]) targetsMap[t.offer_id] = [];
      targetsMap[t.offer_id].push({ geo: t.geo, carrier: t.carrier });
    });

    const result = offersRes.rows.map((o) => ({
      ...o,
      targets: targetsMap[o.offer_id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("GET /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🟡 Get active advertisers
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

// 🟣 Create new offer
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
      fallback_offer_id,
      inapp_template_id,
      inapp_config,
      targets = [],
    } = req.body;

    if (!advertiser_name) return res.status(400).json({ error: "Advertiser name required" });

    const offer_id = await generateOfferId();

    const insertOffer = await pool.query(
      `INSERT INTO offers (
        offer_id, advertiser_name, name, type, payout, tracking_url,
        cap_daily, cap_total, status, fallback_offer_id,
        inapp_template_id, inapp_config, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
      RETURNING *`,
      [
        offer_id,
        advertiser_name,
        name,
        type,
        payout || 0,
        tracking_url || null,
        cap_daily || 0,
        cap_total || 0,
        status || "active",
        fallback_offer_id || null,
        inapp_template_id || null,
        inapp_config ? JSON.stringify(inapp_config) : null,
      ]
    );

    for (const t of targets) {
      await pool.query(
        "INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3)",
        [offer_id, t.geo, t.carrier]
      );
    }

    res.status(201).json(insertOffer.rows[0]);
  } catch (err) {
    console.error("POST /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🟠 Update offer
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
      targets = [],
    } = req.body;

    await pool.query(
      `UPDATE offers
       SET advertiser_name=$1, name=$2, type=$3, payout=$4, tracking_url=$5,
           cap_daily=$6, cap_total=$7, status=$8, fallback_offer_id=$9,
           inapp_template_id=$10, inapp_config=$11, updated_at=NOW()
       WHERE offer_id=$12`,
      [
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
        inapp_config ? JSON.stringify(inapp_config) : null,
        offer_id,
      ]
    );

    await pool.query("DELETE FROM offer_targets WHERE offer_id=$1", [offer_id]);
    for (const t of targets) {
      await pool.query(
        "INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3)",
        [offer_id, t.geo, t.carrier]
      );
    }

    res.json({ message: "Offer updated" });
  } catch (err) {
    console.error("PUT /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔁 Toggle Offer Status
router.put("/:offer_id/toggle", authJWT, async (req, res) => {
  try {
    const { offer_id } = req.params;
    const { rows } = await pool.query("SELECT status FROM offers WHERE offer_id=$1", [offer_id]);
    if (!rows.length) return res.status(404).json({ error: "Offer not found" });

    const newStatus = rows[0].status === "active" ? "inactive" : "active";
    await pool.query("UPDATE offers SET status=$1, updated_at=NOW() WHERE offer_id=$2", [
      newStatus,
      offer_id,
    ]);
    res.json({ message: "Status updated", status: newStatus });
  } catch (err) {
    console.error("Toggle error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
