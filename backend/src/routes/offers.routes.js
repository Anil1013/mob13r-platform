import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =====================================================
DEFAULT UNIVERSAL PARAMETERS (Updated for Antifraud)
===================================================== */

const DEFAULT_PARAMS = [
  ["pin_send_url", ""],
  ["verify_pin_url", ""],
  ["check_status_url", ""],
  ["af_prepare_url", ""],
  ["portal_url", ""],
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
  ["transaction_id", "{transaction_id}"],
  ["headers_b64", "#HEADERS_B64#"],
  ["ip_b64", "#IP_B64#"],
  ["af_id", "#AF_ID#"]
];

async function insertDefaultParams(offerId) {
  for (const [key, value] of DEFAULT_PARAMS) {
    await pool.query(
      `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1,$2,$3)`,
      [offerId, key, value]
    );
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
    return res.status(500).json({ message: "Failed to fetch" });
  }
});

/* =====================================================
CREATE OFFER
===================================================== */
router.post("/", async (req, res) => {
  try {
    const { advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type } = req.body;
    if (!advertiser_id || !service_name) return res.status(400).json({ message: "Fields required" });

    const result = await pool.query(
      `INSERT INTO offers (advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type, today_hits, last_reset_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,CURRENT_DATE,'active') RETURNING *`,
      [advertiser_id, service_name, cpa || 0, daily_cap || null, geo, carrier, service_type || "NORMAL"]
    );
    const offer = result.rows[0];
    await insertDefaultParams(offer.id);
    return res.json(offer);
  } catch (err) {
    return res.status(500).json({ message: "Error" });
  }
});

/* =====================================================
PARAMETERS ROUTES
===================================================== */
router.get("/:offerId/parameters", async (req, res) => {
  const result = await pool.query(`SELECT * FROM offer_parameters WHERE offer_id = $1 ORDER BY id ASC`, [req.params.offerId]);
  res.json(result.rows);
});

router.patch("/parameters/:id", async (req, res) => {
  const { param_value } = req.body;
  const result = await pool.query(`UPDATE offer_parameters SET param_value = $1 WHERE id = $2 RETURNING *`, [param_value, req.params.id]);
  res.json(result.rows[0]);
});

router.post("/:offerId/parameters", async (req, res) => {
  const { param_key, param_value } = req.body;
  const result = await pool.query(`INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1,$2,$3) RETURNING *`, [req.params.offerId, param_key, param_value || ""]);
  res.json(result.rows[0]);
});

router.delete("/parameters/:id", async (req, res) => {
  await pool.query(`DELETE FROM offer_parameters WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

router.patch("/:id", async (req, res) => {
  const { service_name, cpa, daily_cap, geo, carrier } = req.body;
  const result = await pool.query(
    `UPDATE offers SET service_name=COALESCE($1,service_name), cpa=COALESCE($2,cpa), daily_cap=COALESCE($3,daily_cap), geo=COALESCE($4,geo), carrier=COALESCE($5,carrier) WHERE id=$6 RETURNING *`,
    [service_name, cpa, daily_cap, geo, carrier, req.params.id]
  );
  res.json(result.rows[0]);
});

export default router;
