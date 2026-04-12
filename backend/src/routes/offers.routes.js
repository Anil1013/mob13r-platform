import express from "express";
import pool from "../db.js";
const router = express.Router();

// FIXED DEFAULT KEYS (Yahan se system automatically create karega)
const DEFAULT_PARAMS = [
  ["pin_send_url", ""],
  ["verify_pin_url", ""],
  ["check_status_url", ""],
  ["promoId", ""],
  ["msisdn", "{msisdn}"],
  ["pubId", ""],
  ["ip", "{ip}"],
  ["method", "GET"],
  ["pin", "{otp}"],
  ["userAgent", "{user_agent}"]
];

router.get("/", async (req, res) => {
  try {
    const { advertiser_id } = req.query;
    let query = `SELECT o.*, a.name AS advertiser_name FROM offers o JOIN advertisers a ON a.id = o.advertiser_id`;
    if (advertiser_id) query += ` WHERE o.advertiser_id = $1`;
    query += ` ORDER BY o.id DESC`;
    const result = await pool.query(query, advertiser_id ? [advertiser_id] : []);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ status: "FAILED" }); }
});

router.post("/", async (req, res) => {
  try {
    const { advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type } = req.body;
    const result = await pool.query(
      `INSERT INTO offers (advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [advertiser_id, service_name, cpa || 0, daily_cap || null, geo || "", carrier || "", service_type || "NORMAL"]
    );
    const offer = result.rows[0];
    // Naya offer bante hi fixed parameters daal dena
    for (const [key, val] of DEFAULT_PARAMS) {
      await pool.query(`INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [offer.id, key, val]);
    }
    res.json(offer);
  } catch (err) { res.status(500).json({ status: "FAILED" }); }
});

router.get("/:offerId/parameters", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM offer_parameters WHERE offer_id = $1 ORDER BY id ASC`, [req.params.offerId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ status: "FAILED" }); }
});

// Manual Parameter Add karne ke liye route
router.post("/:offerId/parameters", async (req, res) => {
  try {
    const { param_key, param_value } = req.body;
    const result = await pool.query(
      `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.offerId, param_key, param_value]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ status: "FAILED", message: "Key already exists" }); }
});

router.patch("/parameters/:id", async (req, res) => {
  try {
    const { param_value } = req.body;
    const result = await pool.query(`UPDATE offer_parameters SET param_value = $1 WHERE id = $2 RETURNING *`, [param_value, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ status: "FAILED" }); }
});

router.delete("/parameters/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM offer_parameters WHERE id = $1`, [req.params.id]);
    res.json({ status: "SUCCESS" });
  } catch (err) { res.status(500).json({ status: "FAILED" }); }
});

export default router;
