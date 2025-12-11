import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ------------------------------------------------------
   GET ALL TRACKING LINKS
------------------------------------------------------ */
router.get("/", authJWT, async (req, res) => {
  try {
    const { publisher_id, geo, carrier, name, type } = req.query;

    let query = `
      SELECT ptl.*, pub.name AS publisher_name
      FROM publisher_tracking_links ptl
      LEFT JOIN publishers pub ON pub.id = ptl.publisher_id
      WHERE 1=1
    `;
    const params = [];

    if (publisher_id) { params.push(publisher_id); query += ` AND ptl.publisher_id = $${params.length}`; }
    if (geo)         { params.push(geo);          query += ` AND ptl.geo = $${params.length}`; }
    if (carrier)     { params.push(carrier);      query += ` AND ptl.carrier = $${params.length}`; }
    if (name)        { params.push(`%${name}%`);  query += ` AND LOWER(ptl.name) LIKE LOWER($${params.length})`; }
    if (type)        { params.push(type);         query += ` AND ptl.type = $${params.length}`; }

    query += " ORDER BY ptl.id DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows);

  } catch (err) {
    console.error("GET /tracking:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------
   CREATE NEW TRACKING URL (AUTO PUBxx)
------------------------------------------------------ */
router.post("/", authJWT, async (req, res) => {
  try {
    const { publisher_id, name, geo, carrier, type, payout, cap_daily, cap_total, hold_percent, landing_page_url, offer_id } = req.body;

    if (!publisher_id || !geo || !carrier)
      return res.status(400).json({ error: "publisher_id, geo, carrier required" });

    // Fetch publisher name
    const pubRow = await pool.query("SELECT name FROM publishers WHERE id=$1", [publisher_id]);
    const publisher_name = pubRow.rows[0]?.name || "Unknown Publisher";

    // Generate next PUBxx
    const last = await pool.query("SELECT pub_code FROM publisher_tracking_links ORDER BY id DESC LIMIT 1");
    let nextPubId = "PUB01";
    if (last.rows.length) {
      const lastNum = parseInt(last.rows[0].pub_code.replace("PUB", ""));
      nextPubId = "PUB" + String(lastNum + 1).padStart(2, "0");
    }

    // Base URL
    const base = process.env.BASE_TRACKING_URL || "https://backend.mob13r.com";

    let tracking_url = null;
    let pin_send_url = null;
    let pin_verify_url = null;
    let check_status_url = null;
    let portal_url = null;

    let operator_pin_send_url = null;
    let operator_pin_verify_url = null;
    let operator_status_url = null;
    let operator_portal_url = null;
    let required_params = null;

    /* ----------- NON INAPP ---------------- */
    if (type !== "INAPP") {
      tracking_url = `${base}/click?pub_id=${nextPubId}&geo=${geo}&carrier=${carrier}`;
    }

    /* ----------- INAPP LOGIC ---------------- */
    if (type === "INAPP") {
      if (!offer_id) return res.status(400).json({ error: "offer_id required for INAPP" });

      // Fetch operator template from offer_templates
      const tplQ = await pool.query("SELECT * FROM offer_templates WHERE id=$1", [offer_id]);
      if (!tplQ.rows.length) return res.status(400).json({ error: "Offer template not found" });

      const tpl = tplQ.rows[0];

      operator_pin_send_url = tpl.pin_send_url;
      operator_pin_verify_url = tpl.pin_verify_url;
      operator_status_url = tpl.check_status_url;
      operator_portal_url = tpl.portal_url;
      required_params = tpl.parameters || {};

      // Generate frontend display URLs
      const inapp = `${base}/inapp`;

      pin_send_url =
        `${inapp}/sendpin?pub_id=${nextPubId}&msisdn=<msisdn>`;
      pin_verify_url =
        `${inapp}/verifypin?pub_id=${nextPubId}&msisdn=<msisdn>&pin=<otp>`;
      check_status_url =
        `${inapp}/checkstatus?pub_id=${nextPubId}&msisdn=<msisdn>`;
      portal_url =
        `${inapp}/portal?pub_id=${nextPubId}&msisdn=<msisdn>`;
    }

    /* ----------- INSERT INTO DB ---------------- */
    const insertQuery = `
      INSERT INTO publisher_tracking_links
      (pub_code, publisher_id, publisher_name, name, geo, carrier, type, payout,
       cap_daily, cap_total, hold_percent, landing_page_url,
       tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url,
       operator_pin_send_url, operator_pin_verify_url, operator_status_url,
       operator_portal_url, required_params, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
              $18,$19,$20,$21,$22,'active',NOW(),NOW())
      RETURNING *;
    `;

    const values = [
      nextPubId, publisher_id, publisher_name, name, geo, carrier, type,
      payout || 0, cap_daily || 0, cap_total || 0, hold_percent || 0,
      landing_page_url || null,
      tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url,
      operator_pin_send_url, operator_pin_verify_url, operator_status_url,
      operator_portal_url,
      JSON.stringify(required_params)
    ];

    const { rows } = await pool.query(insertQuery, values);
    res.status(201).json(rows[0]);

  } catch (err) {
    console.error("POST /tracking:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
