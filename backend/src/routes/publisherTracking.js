// File: routes/publisherTracking.js

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
    console.error("GET /tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});


/* ------------------------------------------------------
   CREATE NEW TRACKING URL (AUTO PUBxx)
   - Copies operator URLs & parameters from the offer template
   - Saves frontend-friendly inapp URLs (with <placeholders>)
------------------------------------------------------ */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      publisher_id,
      name,
      geo,
      carrier,
      type,
      payout,
      cap_daily,
      cap_total,
      hold_percent,
      landing_page_url,
      offer_id // this is offer.offer_id (string like OFF01)
    } = req.body;

    if (!publisher_id || !geo || !carrier) {
      return res.status(400).json({ error: "publisher_id, geo and carrier are required" });
    }

    // Publisher name
    const pubQ = await pool.query("SELECT name FROM publishers WHERE id=$1", [publisher_id]);
    const publisher_name = pubQ.rows[0]?.name || "Unknown Publisher";

    // Next PUB code
    const last = await pool.query("SELECT pub_code FROM publisher_tracking_links ORDER BY id DESC LIMIT 1");
    let nextPubId = "PUB01";
    if (last.rows.length) {
      const lastNum = parseInt(String(last.rows[0].pub_code).replace("PUB", "")) || 0;
      nextPubId = "PUB" + String(lastNum + 1).padStart(2, "0");
    }

    const base = process.env.BASE_TRACKING_URL || "https://backend.mob13r.com";

    // defaults
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

    // Non-INAPP: simple click URL
    if ((type || "").toUpperCase() !== "INAPP") {
      tracking_url = `${base}/click?pub_id=${nextPubId}&geo=${encodeURIComponent(geo)}&carrier=${encodeURIComponent(carrier)}`;
    }

    // INAPP: fetch template via offers -> inapp_template_id -> offer_templates
    if ((type || "").toUpperCase() === "INAPP") {
      if (!offer_id) return res.status(400).json({ error: "offer_id required for INAPP" });

      // get inapp_template_id from offers table
      const offerRes = await pool.query("SELECT inapp_template_id FROM offers WHERE offer_id = $1 LIMIT 1", [offer_id]);
      if (!offerRes.rows.length) return res.status(400).json({ error: "Offer not found" });

      const templateId = offerRes.rows[0].inapp_template_id;
      if (!templateId) return res.status(400).json({ error: "Offer has no inapp_template_id assigned" });

      // load operator template from offer_templates
      const tplRes = await pool.query(
        `SELECT pin_send_url, pin_verify_url, check_status_url, portal_url, parameters
         FROM offer_templates WHERE id = $1 LIMIT 1`,
        [templateId]
      );

      if (tplRes.rows.length) {
        const tpl = tplRes.rows[0];
        operator_pin_send_url = tpl.pin_send_url || null;
        operator_pin_verify_url = tpl.pin_verify_url || null;
        operator_status_url = tpl.check_status_url || null;
        operator_portal_url = tpl.portal_url || null;

        required_params = tpl.parameters || {};
      } else {
        // template row missing — still allow creating publisher link but no operator urls
        operator_pin_send_url = null;
        operator_pin_verify_url = null;
        operator_status_url = null;
        operator_portal_url = null;
        required_params = {};
      }

      // frontend-friendly internal inapp URLs (copy-paste)
      const inapp = `${base}/inapp`;
      pin_send_url = `${inapp}/sendpin?pub_id=${nextPubId}&msisdn=<msisdn>&ip=<ip>&ua=<ua>&click_id=<click_id>`;
      pin_verify_url = `${inapp}/verifypin?pub_id=${nextPubId}&msisdn=<msisdn>&pin=<otp>&ip=<ip>&ua=<ua>&click_id=<click_id>`;
      check_status_url = `${inapp}/checkstatus?pub_id=${nextPubId}&msisdn=<msisdn>`;
      portal_url = `${inapp}/portal?pub_id=${nextPubId}&msisdn=<msisdn>&click_id=<click_id>`;
    }

    // INSERT — ensure placeholders count matches values
    const insertQuery = `
      INSERT INTO publisher_tracking_links
      (pub_code, publisher_id, publisher_name, name, geo, carrier, type, payout,
       cap_daily, cap_total, hold_percent, landing_page_url,
       tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url,
       operator_pin_send_url, operator_pin_verify_url, operator_status_url, operator_portal_url,
       required_params, status, created_at, updated_at)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW(),NOW())
      RETURNING *;
    `;

    const values = [
      nextPubId,
      publisher_id,
      publisher_name,
      name || null,
      geo,
      carrier,
      (type || "CPA").toUpperCase(),
      payout ?? 0,
      cap_daily ?? 0,
      cap_total ?? 0,
      hold_percent ?? 0,
      landing_page_url || null,
      tracking_url,
      pin_send_url,
      pin_verify_url,
      check_status_url,
      portal_url,
      operator_pin_send_url,
      operator_pin_verify_url,
      operator_status_url,
      operator_portal_url,
      required_params && Object.keys(required_params).length ? JSON.stringify(required_params) : null,
      "active"
    ];

    const { rows } = await pool.query(insertQuery, values);
    res.status(201).json(rows[0]);

  } catch (err) {
    console.error("POST /tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});


/* ------------------------------------------------------
   UPDATE TRACKING LINK — safe update (COALESCE-like)
------------------------------------------------------ */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      payout,
      cap_daily,
      cap_total,
      hold_percent,
      landing_page_url,
      status,
      tracking_url,
      pin_send_url,
      pin_verify_url,
      check_status_url,
      portal_url,
      operator_pin_send_url,
      operator_pin_verify_url,
      operator_status_url,
      operator_portal_url,
      required_params
    } = req.body;

    // update only provided fields; preserve existing operator URLs if not provided
    const query = `
      UPDATE publisher_tracking_links
      SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        payout = COALESCE($3, payout),
        cap_daily = COALESCE($4, cap_daily),
        cap_total = COALESCE($5, cap_total),
        hold_percent = COALESCE($6, hold_percent),
        landing_page_url = COALESCE($7, landing_page_url),
        status = COALESCE($8, status),
        tracking_url = COALESCE($9, tracking_url),
        pin_send_url = COALESCE($10, pin_send_url),
        pin_verify_url = COALESCE($11, pin_verify_url),
        check_status_url = COALESCE($12, check_status_url),
        portal_url = COALESCE($13, portal_url),
        operator_pin_send_url = COALESCE($14, operator_pin_send_url),
        operator_pin_verify_url = COALESCE($15, operator_pin_verify_url),
        operator_status_url = COALESCE($16, operator_status_url),
        operator_portal_url = COALESCE($17, operator_portal_url),
        required_params = COALESCE($18, required_params),
        updated_at = NOW()
      WHERE id = $19
      RETURNING *;
    `;

    const params = [
      name ?? null,
      type ? type.toUpperCase() : null,
      payout ?? null,
      cap_daily ?? null,
      cap_total ?? null,
      hold_percent ?? null,
      landing_page_url ?? null,
      status ?? null,
      tracking_url ?? null,
      pin_send_url ?? null,
      pin_verify_url ?? null,
      check_status_url ?? null,
      portal_url ?? null,
      operator_pin_send_url ?? null,
      operator_pin_verify_url ?? null,
      operator_status_url ?? null,
      operator_portal_url ?? null,
      required_params ? JSON.stringify(required_params) : null,
      id
    ];

    const { rows } = await pool.query(query, params);
    if (!rows.length) return res.status(404).json({ error: "Tracking link not found" });

    res.json(rows[0]);

  } catch (err) {
    console.error("PUT /tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});


export default router;
