import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =====================================================
   DEFAULT UNIVERSAL PARAMETERS
   ===================================================== */

const DEFAULT_PARAMS = [
  ["pin_send_url", ""],
  ["pin_send_fallback_url", ""],
  ["verify_pin_url", ""],
  ["verify_pin_fallback_url", ""],
  ["check_status_url", ""],
  ["portal_url", ""],

  ["method", "GET"],
  ["verify_method", "GET"],

  ["promoId", ""],
  ["pubId", ""],
  ["serviceId", ""],

  ["msisdn", "{msisdn}"],
  ["ip", "{ip}"],
  ["user_ip", "{user_ip}"],
  ["userAgent", "{user_agent}"],
  ["ua", "{ua}"],
  ["pin", "{otp}"],
  ["otp", "{otp}"],

  ["geo", "{geo}"],
  ["carrier", "{carrier}"],

  ["click_id", "{click_id}"],
  ["transaction_id", "{transaction_id}"],

  ["sessionKey", "{session_key}"],
  ["session_token", "{session_token}"],

  ["sub1", "{click_id}"],
  ["sub2", "{publisher_id}"],
  ["sub3", "{offer_id}"],
  ["sub4", ""],
  ["sub5", ""]
];

/* =====================================================
   INSERT DEFAULT PARAMETERS WHEN OFFER CREATED
   ===================================================== */

async function insertDefaultParams(offerId) {

  try {
    for (const [key, value] of DEFAULT_PARAMS) {
      await pool.query(
        `
        INSERT INTO offer_parameters (offer_id, param_key, param_value)
        VALUES ($1, $2, $3)
        ON CONFLICT (offer_id, param_key) DO NOTHING
        `,
        [offerId, key, value]
      );
    }
    return true;
  } catch (err) {
    console.error("Error inserting default params:", err.message);
    return false;
  }

}

/* =====================================================
   GET ALL OFFERS (With Advertiser Join)
   ===================================================== */

router.get("/", async (req, res) => {

  try {

    const { advertiser_id } = req.query;

    let query = `
      SELECT
        o.*,
        a.name AS advertiser_name
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

    console.error("GET OFFERS ERROR:", err.message);

    return res.status(500).json({ 
      status: "FAILED",
      message: "Failed to fetch offers" 
    });

  }

});

/* =====================================================
   CREATE NEW OFFER (Universal Support)
   ===================================================== */

router.post("/", async (req, res) => {

  try {

    const {
      advertiser_id,
      service_name,
      cpa,
      daily_cap,
      geo,
      carrier,
      service_type,
      // Universal Flags from Body
      has_antifraud,
      has_status_check,
      af_trigger_point,
      encode_headers_base64
    } = req.body;

    if (!advertiser_id || !service_name) {

      return res.status(400).json({
        status: "FAILED",
        message: "Missing required fields: advertiser_id and service_name"
      });

    }

    const result = await pool.query(
      `
      INSERT INTO offers
      (
        advertiser_id,
        service_name,
        cpa,
        daily_cap,
        geo,
        carrier,
        service_type,
        today_hits,
        last_reset_date,
        status,
        has_antifraud,
        has_status_check,
        af_trigger_point,
        encode_headers_base64
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, 0, CURRENT_DATE, 'active', $8, $9, $10, $11)
      RETURNING *
      `,
      [
        advertiser_id,
        service_name,
        cpa || 0,
        daily_cap || null,
        geo || "",
        carrier || "",
        service_type || "NORMAL",
        has_antifraud || false,
        has_status_check || false,
        af_trigger_point || 'BEFORE_SEND',
        encode_headers_base64 || false
      ]
    );

    const offer = result.rows[0];

    /* Auto-insert default parameters */
    await insertDefaultParams(offer.id);

    return res.json(offer);

  } catch (err) {

    console.error("CREATE OFFER ERROR:", err.message);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to create offer"
    });

  }

});

/* =====================================================
   GET PARAMETERS FOR SPECIFIC OFFER
   ===================================================== */

router.get("/:offerId/parameters", async (req, res) => {

  try {

    const offerId = Number(req.params.offerId);

    if (isNaN(offerId)) {
      return res.status(400).json({ message: "Invalid offerId" });
    }

    const result = await pool.query(
      `
      SELECT id, param_key, param_value
      FROM offer_parameters
      WHERE offer_id = $1
      ORDER BY id ASC
      `,
      [offerId]
    );

    return res.json(result.rows);

  } catch (err) {

    console.error("GET PARAMETERS ERROR:", err.message);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to fetch parameters"
    });

  }

});

/* =====================================================
   UPDATE SPECIFIC PARAMETER VALUE
   ===================================================== */

router.patch("/parameters/:id", async (req, res) => {

  try {

    const id = Number(req.params.id);
    const { param_value } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid parameter id" });
    }

    const result = await pool.query(
      `
      UPDATE offer_parameters
      SET param_value = $1
      WHERE id = $2
      RETURNING *
      `,
      [param_value, id]
    );

    return res.json(result.rows[0]);

  } catch (err) {

    console.error("UPDATE PARAM ERROR:", err.message);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to update parameter"
    });

  }

});

/* =====================================================
   ADD CUSTOM PARAMETER TO OFFER
   ===================================================== */

router.post("/:offerId/parameters", async (req, res) => {

  try {

    const offerId = Number(req.params.offerId);
    const { param_key, param_value } = req.body;

    if (isNaN(offerId)) {
      return res.status(400).json({ message: "Invalid offerId" });
    }

    if (!param_key) {
      return res.status(400).json({ message: "param_key is required" });
    }

    /* Check if key already exists */
    const exists = await pool.query(
      `SELECT id FROM offer_parameters WHERE offer_id = $1 AND param_key = $2`,
      [offerId, param_key]
    );

    if (exists.rows.length) {
      return res.status(400).json({ message: "This parameter key already exists" });
    }

    const result = await pool.query(
      `
      INSERT INTO offer_parameters (offer_id, param_key, param_value)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [offerId, param_key, param_value || ""]
    );

    return res.json(result.rows[0]);

  } catch (err) {

    console.error("ADD PARAM ERROR:", err.message);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to add parameter"
    });

  }

});

/* =====================================================
   DELETE PARAMETER
   ===================================================== */

router.delete("/parameters/:id", async (req, res) => {

  try {

    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const result = await pool.query(
      `DELETE FROM offer_parameters WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Parameter not found" });
    }

    return res.json({ success: true, message: "Parameter deleted" });

  } catch (err) {

    console.error("DELETE PARAM ERROR:", err.message);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to delete parameter"
    });

  }

});

/* =====================================================
   TOGGLE SERVICE TYPE (NORMAL / FALLBACK)
   ===================================================== */

router.patch("/:offerId/service-type", async (req, res) => {

  try {

    const offerId = Number(req.params.offerId);
    const { service_type } = req.body;

    if (!["NORMAL", "FALLBACK"].includes(service_type)) {
      return res.status(400).json({ message: "Invalid service type" });
    }

    const result = await pool.query(
      `UPDATE offers SET service_type = $1 WHERE id = $2 RETURNING *`,
      [service_type, offerId]
    );

    return res.json(result.rows[0]);

  } catch (err) {

    console.error("CHANGE SERVICE TYPE ERROR:", err.message);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to change service type"
    });

  }

});

/* =====================================================
   UPDATE OFFER DATA (MAIN - Universal Support)
   ===================================================== */

router.patch("/:id", async (req, res) => {

  try {

    const offerId = Number(req.params.id);

    const {
      service_name,
      cpa,
      daily_cap,
      geo,
      carrier,
      status,
      // Universal Workflow Columns
      has_antifraud,
      has_status_check,
      af_prepare_url,
      check_status_url,
      pin_send_url,
      pin_verify_url,
      encode_headers_base64,
      af_trigger_point
    } = req.body;

    const result = await pool.query(
      `
      UPDATE offers
      SET
        service_name = COALESCE($1, service_name),
        cpa = COALESCE($2, cpa),
        daily_cap = $3,
        geo = COALESCE($4, geo),
        carrier = COALESCE($5, carrier),
        status = COALESCE($6, status),
        has_antifraud = COALESCE($7, has_antifraud),
        has_status_check = COALESCE($8, has_status_check),
        af_prepare_url = COALESCE($9, af_prepare_url),
        check_status_url = COALESCE($10, check_status_url),
        pin_send_url = COALESCE($11, pin_send_url),
        pin_verify_url = COALESCE($12, pin_verify_url),
        encode_headers_base64 = COALESCE($13, encode_headers_base64),
        af_trigger_point = COALESCE($14, af_trigger_point)
      WHERE id = $15
      RETURNING *
      `,
      [
        service_name,
        cpa,
        daily_cap, 
        geo,
        carrier,
        status,
        has_antifraud,
        has_status_check,
        af_prepare_url,
        check_status_url,
        pin_send_url,
        pin_verify_url,
        encode_headers_base64,
        af_trigger_point,
        offerId
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Offer not found" });
    }

    return res.json(result.rows[0]);

  } catch (err) {

    console.error("UPDATE OFFER ERROR:", err.message);

    return res.status(500).json({
      status: "FAILED",
      message: "Failed to update offer"
    });

  }

});

export default router;
