import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =====================================================
   UNIVERSAL & ANTI-FRAUD DEFAULT PARAMETERS
   ===================================================== */
const DEFAULT_PARAMS = [
  ["pin_send_url", ""],
  ["pin_verify_url", ""],
  ["check_status_url", ""],
  ["portal_url", ""],
  ["method", "POST"], // GET/POST control
  ["service_id", ""],  // Required for Pin Send [cite: 22, 60, 93]
  ["af_button_id", "submitterButton"], // For AF tracking [cite: 93, 136, 397]
  ["msisdn", "{msisdn}"],
  ["ip", "{ip}"],
  ["userAgent", "{user_agent}"],
  ["pin", "{otp}"],
  ["click_id", "{click_id}"],
  ["transaction_id", "{transaction_id}"]
];

async function insertDefaultParams(offerId) {
  for (const [key, value] of DEFAULT_PARAMS) {
    await pool.query(
      `INSERT INTO offer_parameters (offer_id, param_key, param_value)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [offerId, key, value]
    );
  }
}

/* =====================================================
   CORE OFFERS LOGIC (As per your DB Schema)
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
    return res.status(500).json({ message: "Fetch error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type,
      has_antifraud, af_prepare_url, encode_ip_base64, encode_headers_base64
    } = req.body;

    const result = await pool.query(
      `INSERT INTO offers 
      (advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type, 
       has_antifraud, af_prepare_url, encode_ip_base64, encode_headers_base64, 
       today_hits, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, 0, 'active') RETURNING *`,
      [
        advertiser_id, service_name, cpa || 0, daily_cap || null, geo, carrier, 
        service_type || "NORMAL", has_antifraud || false, af_prepare_url || "",
        encode_ip_base64 || false, encode_headers_base64 || false
      ]
    );

    const offer = result.rows[0];
    await insertDefaultParams(offer.id);
    return res.json(offer);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/* =====================================================
   PARAMETERS MANAGEMENT
   ===================================================== */

router.get("/:offerId/parameters", async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM offer_parameters WHERE offer_id = $1 ORDER BY id ASC`,
    [req.params.offerId]
  );
  res.json(result.rows);
});

router.patch("/parameters/:id", async (req, res) => {
  const { param_value } = req.body;
  const result = await pool.query(
    `UPDATE offer_parameters SET param_value = $1 WHERE id = $2 RETURNING *`,
    [param_value, req.params.id]
  );
  res.json(result.rows[0]);
});

router.post("/:offerId/parameters", async (req, res) => {
  const { param_key, param_value } = req.body;
  const result = await pool.query(
    `INSERT INTO offer_parameters (offer_id, param_key, param_value) 
     VALUES ($1,$2,$3) RETURNING *`,
    [req.params.offerId, param_key, param_value || ""]
  );
  res.json(result.rows[0]);
});

router.delete("/parameters/:id", async (req, res) => {
  await pool.query(`DELETE FROM offer_parameters WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

/* Update Offer (Inline Edit) */
router.patch("/:id", async (req, res) => {
  const fields = req.body;
  const setClause = Object.keys(fields).map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = Object.values(fields);
  const result = await pool.query(
    `UPDATE offers SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
    [...values, req.params.id]
  );
  res.json(result.rows[0]);
});

export default router;
