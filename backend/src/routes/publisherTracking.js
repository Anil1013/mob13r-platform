// File: routes/publisherTracking.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   Helper: get publisher name by id
====================================================== */
async function getPublisherName(id) {
  const q = await pool.query("SELECT name FROM publishers WHERE id=$1", [id]);
  return q.rows[0]?.name || "Unknown Publisher";
}

/* ======================================================
   GET ALL TRACKING LINKS
====================================================== */
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

    if (publisher_id) {
      params.push(publisher_id);
      query += ` AND ptl.publisher_id = $${params.length}`;
    }
    if (geo) {
      params.push(geo);
      query += ` AND ptl.geo = $${params.length}`;
    }
    if (carrier) {
      params.push(carrier);
      query += ` AND ptl.carrier = $${params.length}`;
    }
    if (name) {
      params.push(`%${name}%`);
      query += ` AND LOWER(ptl.name) LIKE LOWER($${params.length})`;
    }
    if (type) {
      params.push(type);
      query += ` AND ptl.type = $${params.length}`;
    }

    query += " ORDER BY ptl.id DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   CREATE NEW TRACKING URL (AUTO PUBxx) - copies operator template
   * expects offer_id for INAPP so it can fetch operator template
====================================================== */
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
      offer_id, // REQUIRED for INAPP
    } = req.body;

    if (!publisher_id || !geo || !carrier) {
      return res.status(400).json({ error: "publisher_id, geo, and carrier are required" });
    }

    const publisher_name = await getPublisherName(publisher_id);

    // Generate next PUBxx
    const last = await pool.query("SELECT pub_code FROM publisher_tracking_links ORDER BY id DESC LIMIT 1");
    let nextPubId = "PUB01";
    if (last.rows.length > 0 && last.rows[0].pub_code) {
      const lastCode = parseInt(last.rows[0].pub_code.replace(/^PUB/i, "") || "0");
      nextPubId = "PUB" + String(lastCode + 1).padStart(2, "0");
    }

    const base = process.env.BASE_TRACKING_URL || "https://backend.mob13r.com";

    // publisher-visible URLs (internal inapp endpoints)
    let tracking_url = null;
    let pin_send_url = null;
    let pin_verify_url = null;
    let check_status_url = null;
    let portal_url = null;

    // operator URLs (copied from offer_templates) + operator parameter mapping
    let operator_pin_send_url = null;
    let operator_pin_verify_url = null;
    let operator_status_url = null;
    let operator_portal_url = null;
    let operator_parameters = null; // jsonb mapping: { "operatorParam": "publisherParam", ... }

    // NON-INAPP: set click tracking URL
    if (type !== "INAPP") {
      tracking_url = `${base}/click?pub_id=${nextPubId}&geo=${geo}&carrier=${carrier}`;
    }

    // INAPP: must have offer_id -> load offer_templates
    if (type === "INAPP") {
      if (!offer_id) {
        return res.status(400).json({ error: "offer_id is required for INAPP tracking links" });
      }

      // Load offer to find inapp_template_id
      const offerQ = await pool.query("SELECT inapp_template_id FROM offers WHERE offer_id=$1 LIMIT 1", [offer_id]);
      if (!offerQ.rows.length) {
        return res.status(400).json({ error: "Offer not found" });
      }
      const templateId = offerQ.rows[0].inapp_template_id;
      if (!templateId) {
        return res.status(400).json({ error: "INAPP offer has no template assigned" });
      }

      // Load template
      const tplQ = await pool.query(
        `SELECT pin_send_url, pin_verify_url, check_status_url, portal_url, parameters
         FROM offer_templates WHERE id=$1 LIMIT 1`,
        [templateId]
      );
      if (!tplQ.rows.length) {
        return res.status(400).json({ error: "Offer template not found" });
      }
      const tpl = tplQ.rows[0];

      // Save operator URLs directly from template so inappRoutes can use them
      operator_pin_send_url = tpl.pin_send_url || null;
      operator_pin_verify_url = tpl.pin_verify_url || null;
      operator_status_url = tpl.check_status_url || null;
      operator_portal_url = tpl.portal_url || null;
      operator_parameters = tpl.parameters || null; // expected jsonb mapping like {"cid":"click_id", "msisdn":"msisdn"}

      // Publisher-facing inapp endpoints (copy/paste friendly) — these include placeholders for publisher to replace
      const inapp = `${base}/inapp`;
      pin_send_url = `${inapp}/sendpin?pub_id=${nextPubId}&msisdn=<msisdn>&ip=<ip>&ua=<ua>&click_id=<click_id>`;
      pin_verify_url = `${inapp}/verifypin?pub_id=${nextPubId}&msisdn=<msisdn>&pin=<otp>&ip=<ip>&ua=<ua>&click_id=<click_id>`;
      check_status_url = `${inapp}/checkstatus?pub_id=${nextPubId}&msisdn=<msisdn>`;
      portal_url = `${inapp}/portal?pub_id=${nextPubId}&msisdn=<msisdn>&click_id=<click_id>`;
    }

    // required params (auto-detect for INAPP)
    const required_params = type === "INAPP"
      ? { ip: true, ua: true, msisdn: true, click_id: true, otp: true }
      : null;

    // Insert
    const insertQuery = `
      INSERT INTO publisher_tracking_links
      (pub_code, publisher_id, publisher_name, name, geo, carrier, type, payout,
       cap_daily, cap_total, hold_percent, landing_page_url,
       tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url,
       operator_pin_send_url, operator_pin_verify_url, operator_status_url, operator_portal_url,
       operator_parameters, required_params, status, created_at, updated_at)
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
       $13,$14,$15,$16,$17,
       $18,$19,$20,$21,
       $22,$23,$24,NOW(),NOW())
      RETURNING *;
    `;

    const values = [
      nextPubId,
      publisher_id,
      publisher_name,
      name,
      geo,
      carrier,
      type || "CPA",
      payout || 0,
      cap_daily || 0,
      cap_total || 0,
      hold_percent || 0,
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
      operator_parameters ? JSON.stringify(operator_parameters) : null,
      required_params ? JSON.stringify(required_params) : null,
      "active"
    ];

    const { rows } = await pool.query(insertQuery, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   UPDATE TRACKING LINK — do not overwrite operator_* unless provided
   Use COALESCE so existing operator urls stay available if frontend doesn't send them
====================================================== */
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
      operator_parameters,
      required_params
    } = req.body;

    const query = `
      UPDATE publisher_tracking_links
      SET
        name = $1,
        type = $2,
        payout = $3,
        cap_daily = $4,
        cap_total = $5,
        hold_percent = $6,
        landing_page_url = $7,
        status = $8,
        tracking_url = COALESCE($9, tracking_url),
        pin_send_url = COALESCE($10, pin_send_url),
        pin_verify_url = COALESCE($11, pin_verify_url),
        check_status_url = COALESCE($12, check_status_url),
        portal_url = COALESCE($13, portal_url),
        operator_pin_send_url = COALESCE($14, operator_pin_send_url),
        operator_pin_verify_url = COALESCE($15, operator_pin_verify_url),
        operator_status_url = COALESCE($16, operator_status_url),
        operator_portal_url = COALESCE($17, operator_portal_url),
        operator_parameters = COALESCE($18, operator_parameters),
        required_params = COALESCE($19, required_params),
        updated_at = NOW()
      WHERE id = $20
      RETURNING *;
    `;

    const params = [
      name,
      type,
      payout,
      cap_daily,
      cap_total,
      hold_percent,
      landing_page_url,
      status,
      tracking_url ?? null,
      pin_send_url ?? null,
      pin_verify_url ?? null,
      check_status_url ?? null,
      portal_url ?? null,
      operator_pin_send_url ?? null,
      operator_pin_verify_url ?? null,
      operator_status_url ?? null,
      operator_portal_url ?? null,
      operator_parameters ? JSON.stringify(operator_parameters) : null,
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
