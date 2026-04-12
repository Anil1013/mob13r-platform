import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =====================================================
   DEFAULT UNIVERSAL PARAMETERS (Marked Area Automatic Keys)
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
  ["sub1", "{click_id}"],
  ["sub2", "{publisher_id}"],
  ["sub3", "{offer_id}"],
  ["headers_b64", "#HEADERS_B64#"],
  ["af_id", "#AF_ID#"]
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
    console.error("Error inserting default params:", err.message);
  }
}

/* =====================================================
   GET ALL OFFERS (With Advertiser Join)
   ===================================================== */
router.get("/", async (req, res) => {
  try {
    const { advertiser_id } = req.query;
    let query = `
      SELECT o.*, a.name AS advertiser_name
      FROM offers o
      JOIN advertisers a ON a.id = o.advertiser_id
    `;
    const values = [];
    if (advertiser_id) {
      query += ` WHERE o.advertiser_id = $1`;
      values.push(advertiser_id);
    }
    query += ` ORDER BY o.id DESC`;
    const result = await pool.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    console.error("GET OFFERS ERROR:", err.message);
    return res.status(500).json({ status: "FAILED", message: "Failed to fetch" });
  }
});

/* =====================================================
   CREATE NEW OFFER
   ===================================================== */
router.post("/", async (req, res) => {
  try {
    const { advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type } = req.body;
    if (!advertiser_id || !service_name) {
      return res.status(400).json({ status: "FAILED", message: "Missing fields" });
    }
    const result = await pool.query(
      `INSERT INTO offers (advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type, today_hits, last_reset_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_DATE, 'active')
       RETURNING *`,
      [advertiser_id, service_name, cpa || 0, daily_cap || null, geo || "", carrier || "", service_type || "NORMAL"]
    );
    const offer = result.rows[0];
    await insertDefaultParams(offer.id);
    return res.json(offer);
  } catch (err) {
    console.error("CREATE ERROR:", err.message);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   PARAMETERS MANAGEMENT (GET/POST/PATCH/DELETE)
   ===================================================== */
router.get("/:offerId/parameters", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM offer_parameters WHERE offer_id = $1 ORDER BY id ASC`,
      [req.params.offerId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ status: "FAILED" });
  }
});

router.post("/:offerId/parameters", async (req, res) => {
  try {
    const { param_key, param_value } = req.body;
    const result = await pool.query(
      `INSERT INTO offer_parameters (offer_id, param_key, param_value)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.offerId, param_key, param_value || ""]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ status: "FAILED", message: "Exists" });
  }
});

router.patch("/parameters/:id", async (req, res) => {
  try {
    const { param_value } = req.body;
    const result = await pool.query(
      `UPDATE offer_parameters SET param_value = $1 WHERE id = $2 RETURNING *`,
      [param_value, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ status: "FAILED" });
  }
});

router.delete("/parameters/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM offer_parameters WHERE id = $1`, [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   UPDATE OFFER DATA (MAIN)
   ===================================================== */
router.patch("/:id", async (req, res) => {
  try {
    const { service_name, cpa, daily_cap, geo, carrier, status, service_type } = req.body;
    const result = await pool.query(
      `UPDATE offers SET 
       service_name = COALESCE($1, service_name),
       cpa = COALESCE($2, cpa),
       daily_cap = $3,
       geo = COALESCE($4, geo),
       carrier = COALESCE($5, carrier),
       status = COALESCE($6, status),
       service_type = COALESCE($7, service_type)
       WHERE id = $8 RETURNING *`,
      [service_name, cpa, daily_cap, geo, carrier, status, service_type, req.params.id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
