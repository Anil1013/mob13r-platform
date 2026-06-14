import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

const DEFAULT_PARAMS = [
  ["pin_send_url", ""], ["pin_send_fallback_url", ""], ["verify_pin_url", ""],
  ["verify_pin_fallback_url", ""], ["check_status_url", ""], ["portal_url", ""],
  ["method", "GET"], ["verify_method", "GET"], ["promoId", ""], ["pubId", ""],
  ["serviceId", ""], ["msisdn", "{msisdn}"], ["ip", "{ip}"], ["user_ip", "{user_ip}"],
  ["userAgent", "{user_agent}"], ["ua", "{ua}"], ["pin", "{otp}"], ["otp", "{otp}"],
  ["geo", "{geo}"], ["carrier", "{carrier}"], ["click_id", "{click_id}"],
  ["transaction_id", "{transaction_id}"], ["sessionKey", "{session_key}"],
  ["session_token", "{session_token}"], ["sub1", "{click_id}"], ["sub2", "{publisher_id}"],
  ["sub3", "{offer_id}"], ["sub4", ""], ["sub5", ""]
];

async function insertDefaultParams(offerId) {
  try {
    for (const [key, value] of DEFAULT_PARAMS) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1, $2, $3) ON CONFLICT (offer_id, param_key) DO NOTHING`,
        [offerId, key, value]
      );
    }
    return true;
  } catch (err) {
    console.error("Error inserting default params:", err.message);
    return false;
  }
}

router.get("/", orgAuth, async (req, res) => {
  try {
    const { advertiser_id } = req.query;
    let query = `SELECT o.*, a.name AS advertiser_name FROM offers o
                 JOIN advertisers a ON a.id = o.advertiser_id
                 WHERE o.org_id = $1`;
    const params = [req.orgId];
    if (advertiser_id) {
      query += ` AND o.advertiser_id = $2`;
      params.push(advertiser_id);
    }
    query += ` ORDER BY o.id DESC`;
    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error("GET OFFERS ERROR:", err.message);
    return res.status(500).json({ status: "FAILED", message: "Failed to fetch offers" });
  }
});

router.post("/", orgAuth, async (req, res) => {
  try {
    const { advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type,
            has_antifraud, has_status_check, af_trigger_point, encode_headers_base64, otp_length } = req.body;
    if (!advertiser_id || !service_name) {
      return res.status(400).json({ status: "FAILED", message: "Missing required fields" });
    }
    const result = await pool.query(
      `INSERT INTO offers (advertiser_id, service_name, cpa, daily_cap, geo, carrier, service_type,
        today_hits, last_reset_date, status, has_antifraud, has_status_check, af_trigger_point,
        encode_headers_base64, otp_length, org_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,CURRENT_DATE,'active',$8,$9,$10,$11,$12,$13) RETURNING *`,
      [advertiser_id, service_name, cpa||0, daily_cap||null, geo||"", carrier||"",
       service_type||"NORMAL", has_antifraud||false, has_status_check||false,
       af_trigger_point||'BEFORE_SEND', encode_headers_base64||false, otp_length||4, req.orgId]
    );
    const offer = result.rows[0];
    await insertDefaultParams(offer.id);
    return res.json(offer);
  } catch (err) {
    console.error("CREATE OFFER ERROR:", err.message);
    return res.status(500).json({ status: "FAILED", message: "Failed to create offer" });
  }
});

router.get("/:offerId/parameters", orgAuth, async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    if (isNaN(offerId)) return res.status(400).json([]);
    let result = await pool.query(
      `SELECT id, param_key, param_value FROM offer_parameters WHERE offer_id = $1 ORDER BY id ASC`,
      [offerId]
    );
    const existingKeys = result.rows.map(p => p.param_key);
    const missing = DEFAULT_PARAMS.filter(([key]) => !existingKeys.includes(key));
    if (missing.length > 0) {
      for (const [key, value] of missing) {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [offerId, key, value]
        );
      }
      result = await pool.query(
        `SELECT id, param_key, param_value FROM offer_parameters WHERE offer_id = $1 ORDER BY id ASC`,
        [offerId]
      );
    }
    return res.json(result.rows);
  } catch (err) {
    console.error("GET PARAMETERS ERROR:", err.message);
    return res.status(500).json([]);
  }
});

router.patch("/parameters/:id", orgAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { param_value } = req.body;
    const result = await pool.query(
      `UPDATE offer_parameters SET param_value = $1 WHERE id = $2 RETURNING *`,
      [param_value, id]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ status: "FAILED", message: "Failed to update parameter" });
  }
});

router.post("/:offerId/parameters", orgAuth, async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    const { param_key, param_value } = req.body;
    if (!param_key) return res.status(400).json({ message: "param_key is required" });
    const exists = await pool.query(
      `SELECT id FROM offer_parameters WHERE offer_id = $1 AND param_key = $2`,
      [offerId, param_key]
    );
    if (exists.rows.length) return res.status(400).json({ message: "This parameter key already exists" });
    const result = await pool.query(
      `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3) RETURNING *`,
      [offerId, param_key, param_value || ""]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ status: "FAILED", message: "Failed to add parameter" });
  }
});

router.delete("/parameters/:id", orgAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(`DELETE FROM offer_parameters WHERE id = $1 RETURNING *`, [id]);
    if (!result.rows.length) return res.status(404).json({ message: "Parameter not found" });
    return res.json({ success: true, message: "Parameter deleted" });
  } catch (err) {
    return res.status(500).json({ status: "FAILED", message: "Failed to delete parameter" });
  }
});

router.patch("/:offerId/service-type", orgAuth, async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    const { service_type } = req.body;
    if (!["NORMAL", "FALLBACK"].includes(service_type)) return res.status(400).json({ message: "Invalid service type" });
    const result = await pool.query(
      `UPDATE offers SET service_type = $1 WHERE id = $2 AND org_id = $3 RETURNING *`,
      [service_type, offerId, req.orgId]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ status: "FAILED", message: "Failed to change service type" });
  }
});

router.patch("/:id", orgAuth, async (req, res) => {
  try {
    const offerId = Number(req.params.id);
    const { service_name, cpa, daily_cap, geo, carrier, status, has_antifraud,
            has_status_check, af_prepare_url, check_status_url, pin_send_url,
            pin_verify_url, encode_headers_base64, af_trigger_point, otp_length } = req.body;
    const result = await pool.query(
      `UPDATE offers SET
        service_name = COALESCE($1, service_name), cpa = COALESCE($2, cpa),
        daily_cap = $3, geo = COALESCE($4, geo), carrier = COALESCE($5, carrier),
        status = COALESCE($6, status), has_antifraud = COALESCE($7, has_antifraud),
        has_status_check = COALESCE($8, has_status_check), af_prepare_url = COALESCE($9, af_prepare_url),
        check_status_url = COALESCE($10, check_status_url), pin_send_url = COALESCE($11, pin_send_url),
        pin_verify_url = COALESCE($12, pin_verify_url), encode_headers_base64 = COALESCE($13, encode_headers_base64),
        af_trigger_point = COALESCE($14, af_trigger_point), otp_length = COALESCE($15, otp_length)
       WHERE id = $16 AND org_id = $17 RETURNING *`,
      [service_name, cpa, daily_cap, geo, carrier, status, has_antifraud, has_status_check,
       af_prepare_url, check_status_url, pin_send_url, pin_verify_url, encode_headers_base64,
       af_trigger_point, otp_length, offerId, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Offer not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE OFFER ERROR:", err.message);
    return res.status(500).json({ status: "FAILED", message: "Failed to update offer" });
  }
});

export default router;
