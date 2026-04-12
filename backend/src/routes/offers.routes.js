import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =====================================================
   DEFAULT UNIVERSAL PARAMETERS (Automatic Mentioned Keys)
   ===================================================== */
const DEFAULT_PARAMS = [
  ["pin_send_url", ""],
   ["pin_send_fallback_url", ""],
  ["verify_pin_url", ""],
   ["verify_pin_fallback_url", ""],
  ["check_status_url", ""],
  ["af_prepare_url", ""],
  ["method", "GET"],
  ["promoId", ""],
  ["pubId", ""],
  ["msisdn", "{msisdn}"],
  ["ip", "{ip}"],
  ["userAgent", "{user_agent}"],
  ["pin", "{otp}"],
  ["geo", "{geo}"],
  ["carrier", "{carrier}"],
  ["click_id", "{click_id}"],
  ["transaction_id", "{transaction_id}"]
];

async function insertDefaultParams(offerId) {
  try {
    for (const [key, value] of DEFAULT_PARAMS) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [offerId, key, value]
      );
    }
  } catch (err) {
    console.error("Default Param Insertion Error:", err.message);
  }
}

/* =====================================================
   GET OFFERS
   ===================================================== */
router.get("/", async (req, res) => {
  try {
    const { advertiser_id } = req.query;
    let query = `
      SELECT o.*, a.name AS advertiser_name
      FROM offers o
      JOIN advertisers a ON a.id = o.advertiser_id
    `;
    const params = [];
    if (advertiser_id) {
      query += ` WHERE o.advertiser_id = $1`;
      params.push(advertiser_id);
    }
    query += ` ORDER BY o.id DESC`;
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ status: "FAILED", message: "Fetch failed" });
  }
});

/* =====================================================
   CREATE OFFER
   ===================================================== */
router.post("/", async (req, res) => {
  try {
    const { advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type } = req.body;
    if (!advertiser_id || !service_name) return res.status(400).json({ message: "Missing fields" });

    const result = await pool.query(
      `INSERT INTO offers (advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type, today_hits, last_reset_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_DATE, 'active') RETURNING *`,
      [advertiser_id, service_name, cpa || 0, daily_cap || null, geo || "", carrier || "", service_type || "NORMAL"]
    );
    const offer = result.rows[0];
    await insertDefaultParams(offer.id);
    return res.json(offer);
  } catch (err) {
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   PARAMETERS MANAGEMENT
   ===================================================== */
router.get("/:offerId/parameters", async (req, res) => {
  const result = await pool.query(`SELECT * FROM offer_parameters WHERE offer_id = $1 ORDER BY id ASC`, [req.params.offerId]);
  res.json(result.rows);
});

router.post("/:offerId/parameters", async (req, res) => {
  const { param_key, param_value } = req.body;
  const result = await pool.query(`INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1,$2,$3) RETURNING *`, [req.params.offerId, param_key, param_value || ""]);
  res.json(result.rows[0]);
});

router.patch("/parameters/:id", async (req, res) => {
  const { param_value } = req.body;
  const result = await pool.query(`UPDATE offer_parameters SET param_value = $1 WHERE id = $2 RETURNING *`, [param_value, req.params.id]);
  res.json(result.rows[0]);
});

// 🔥 DELETE ROUTE (To remove SESSION_KEY etc.)
router.delete("/parameters/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM offer_parameters WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   UPDATE OFFER DATA
   ===================================================== */
router.patch("/:id", async (req, res) => {
  try {
    const fields = req.body;
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, val] of Object.entries(fields)) {
      sets.push(`${key} = $${i}`);
      values.push(val);
      i++;
    }
    values.push(req.params.id);
    const result = await pool.query(`UPDATE offers SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`, values);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
