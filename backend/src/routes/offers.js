import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

// Helper: Generate sequential offer IDs (OFF01, OFF02)
const generateOfferId = async () => {
  const prefix = "OFF";
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM offers");
  const next = rows[0].count + 1;
  return `${prefix}${String(next).padStart(2, "0")}`; // OFF01 style
};

// GET /api/offers - get all offers with targets
router.get("/", authJWT, async (req, res) => {
  try {
    const offersQuery = `
      SELECT o.*, t.template_name
      FROM offers o
      LEFT JOIN offer_templates t ON o.inapp_template_id = t.id
      ORDER BY o.id DESC
    `;
    const offersRes = await pool.query(offersQuery);

    // load all targets and attach
    const targetsRes = await pool.query("SELECT * FROM offer_targets");
    const targetsMap = {};
    targetsRes.rows.forEach((r) => {
      if (!targetsMap[r.offer_id]) targetsMap[r.offer_id] = [];
      targetsMap[r.offer_id].push({ geo: r.geo, carrier: r.carrier });
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

// GET /api/offers/advertisers - active advertisers list
router.get("/advertisers", authJWT, async (req, res) => {
  try {
    const q = await pool.query("SELECT name FROM advertisers WHERE status='active' ORDER BY name ASC");
    res.json(q.rows);
  } catch (err) {
    console.error("GET advertisers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/offers - create
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      advertiser_name,
      name,
      type,
      offer_role = "normal",
      payout,
      tracking_url,
      cap_daily,
      cap_total,
      status = "active",
      fallback_offer_id,
      inapp_template_id,
      inapp_config,
      targets = [],
    } = req.body;

    if (!advertiser_name) return res.status(400).json({ error: "Advertiser name required" });
    if (!name) return res.status(400).json({ error: "Offer name required" });
    if (["CPA", "CPI", "CPL", "CPS"].includes(type) && !tracking_url) {
      return res.status(400).json({ error: `${type} offers require tracking_url` });
    }

    const offer_id = await generateOfferId();

    const insertOffer = await pool.query(
      `INSERT INTO offers (
        offer_id, advertiser_name, name, type, offer_role, payout, tracking_url,
        cap_daily, cap_total, status, fallback_offer_id, inapp_template_id, inapp_config, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW()) RETURNING *`,
      [
        offer_id,
        advertiser_name,
        name,
        type,
        offer_role,
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
      await pool.query("INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3)", [
        offer_id,
        t.geo,
        t.carrier || null,
      ]);
    }

    res.status(201).json(insertOffer.rows[0]);
  } catch (err) {
    console.error("POST /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/offers/:offer_id - update offer
router.put("/:offer_id", authJWT, async (req, res) => {
  try {
    const { offer_id } = req.params;
    const {
      advertiser_name,
      name,
      type,
      offer_role = "normal",
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
      `UPDATE offers SET
         advertiser_name=$1, name=$2, type=$3, offer_role=$4, payout=$5, tracking_url=$6,
         cap_daily=$7, cap_total=$8, status=$9, fallback_offer_id=$10,
         inapp_template_id=$11, inapp_config=$12, updated_at=NOW()
       WHERE offer_id=$13`,
      [
        advertiser_name,
        name,
        type,
        offer_role,
        payout || 0,
        tracking_url || null,
        cap_daily || 0,
        cap_total || 0,
        status || "inactive",
        fallback_offer_id || null,
        inapp_template_id || null,
        inapp_config ? JSON.stringify(inapp_config) : null,
        offer_id,
      ]
    );

    // replace targets
    await pool.query("DELETE FROM offer_targets WHERE offer_id=$1", [offer_id]);
    for (const t of targets) {
      await pool.query("INSERT INTO offer_targets (offer_id, geo, carrier) VALUES ($1,$2,$3)", [
        offer_id,
        t.geo,
        t.carrier || null,
      ]);
    }

    res.json({ message: "Offer updated" });
  } catch (err) {
    console.error("PUT /offers error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/offers/:offer_id/toggle - toggle active/inactive
router.put("/:offer_id/toggle", authJWT, async (req, res) => {
  try {
    const { offer_id } = req.params;
    const { rows } = await pool.query("SELECT status FROM offers WHERE offer_id=$1", [offer_id]);
    if (!rows.length) return res.status(404).json({ error: "Offer not found" });
    const newStatus = rows[0].status === "active" ? "inactive" : "active";
    await pool.query("UPDATE offers SET status=$1, updated_at=NOW() WHERE offer_id=$2", [newStatus, offer_id]);
    res.json({ message: "Status updated", status: newStatus });
  } catch (err) {
    console.error("Toggle error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Resolve fallback for given offer
 * Rules:
 *  - find geo/carrier from offer_targets (first target)
 *  - pick an active offer with same geo+carrier and offer_role='fallback' and not the original
 *  - prefer offers with remaining cap (if you add cap tracking later)
 */
router.get("/resolve-fallback/:offer_id", authJWT, async (req, res) => {
  try {
    const { offer_id } = req.params;

    // get a target (geo/carrier) for the source offer
    const t = await pool.query("SELECT geo, carrier FROM offer_targets WHERE offer_id=$1 LIMIT 1", [offer_id]);
    if (!t.rows.length) return res.status(404).json({ error: "No targeting found for offer" });
    const { geo, carrier } = t.rows[0];

    const q = await pool.query(
      `SELECT o.offer_id, o.tracking_url, o.payout
       FROM offers o
       JOIN offer_targets ot ON o.offer_id = ot.offer_id
       WHERE ot.geo = $1 AND ot.carrier = $2
         AND o.status = 'active'
         AND o.offer_role = 'fallback'
         AND o.offer_id != $3
       ORDER BY RANDOM()
       LIMIT 1`,
      [geo, carrier, offer_id]
    );

    if (!q.rows.length) return res.json({ message: "No fallback available", redirect: null });

    res.json({ message: "Fallback found", fallback: q.rows[0], geo, carrier });
  } catch (err) {
    console.error("Fallback resolve error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
