// routes/publisherTracking.js
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

/* ------------------------------------------------------
   CREATE NEW TRACKING URL (AUTO PUBxx)
   - For INAPP we:
     1) Load offer -> offer_templates (operator URLs)
     2) Build publisher-facing inapp URLs (pin_send_url etc)
     3) Save both publisher-facing and operator URLs into DB
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
      offer_id, // required for INAPP
    } = req.body;

    if (!publisher_id || !geo || !carrier) {
      return res.status(400).json({ error: "publisher_id, geo, and carrier are required" });
    }

    // Fetch publisher name
    const pubQuery = await pool.query(
      "SELECT name FROM publishers WHERE id = $1",
      [publisher_id]
    );
    const publisher_name = pubQuery.rows[0]?.name || "Unknown Publisher";

    // Generate next PUBxx
    const last = await pool.query(
      "SELECT pub_code FROM publisher_tracking_links ORDER BY id DESC LIMIT 1"
    );

    let nextPubId = "PUB01";
    if (last.rows.length > 0) {
      const lastCode = parseInt(last.rows[0].pub_code.replace("PUB", ""), 10);
      nextPubId = `PUB${String(lastCode + 1).padStart(2, "0")}`;
    }

    const base = process.env.BASE_TRACKING_URL || "https://backend.mob13r.com";

    // Publish-facing URLs (what publishers will copy) and operator/vendor URLs
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

    if (type !== "INAPP") {
      tracking_url = `${base}/click?pub_id=${nextPubId}&geo=${geo}&carrier=${carrier}`;
    }

    if (type === "INAPP") {
      if (!offer_id) {
        return res.status(400).json({ error: "offer_id is required for INAPP tracking links" });
      }

      // Load template id from offers and then operator urls from offer_templates
      const offerRow = await pool.query(
        "SELECT inapp_template_id FROM offers WHERE offer_id = $1 LIMIT 1",
        [offer_id]
      );

      if (!offerRow.rows.length) {
        return res.status(400).json({ error: "Offer not found" });
      }

      const tplId = offerRow.rows[0].inapp_template_id;
      if (!tplId) {
        return res.status(400).json({ error: "Offer has no inapp_template assigned" });
      }

      const tpl = (
        await pool.query(
          `SELECT pin_send_url, pin_verify_url, check_status_url, portal_url FROM offer_templates WHERE id = $1 LIMIT 1`,
          [tplId]
        )
      ).rows[0];

      // operator/vendor URLs (these will be called by inappRoutes)
      operator_pin_send_url = tpl?.pin_send_url || null;
      operator_pin_verify_url = tpl?.pin_verify_url || null;
      operator_status_url = tpl?.check_status_url || null;
      operator_portal_url = tpl?.portal_url || null;

      // publisher-facing internal inapp endpoints (these are used by publishers)
      const inapp = `${base}/inapp`;
      pin_send_url = `${inapp}/sendpin?pub_id=${nextPubId}&msisdn=<msisdn>&ip=<ip>&ua=<ua>&click_id=<click_id>`;
      pin_verify_url = `${inapp}/verifypin?pub_id=${nextPubId}&msisdn=<msisdn>&pin=<otp>&ip=<ip>&ua=<ua>&click_id=<click_id>`;
      check_status_url = `${inapp}/checkstatus?pub_id=${nextPubId}&msisdn=<msisdn>`;
      portal_url = `${inapp}/portal?pub_id=${nextPubId}&msisdn=<msisdn>&click_id=<click_id>`;

      required_params = {
        ip: true,
        ua: true,
        msisdn: true,
        click_id: true,
        otp: true,
      };
    }

    // Insert record — include operator_* columns (migration must run)
    const insertQuery = `
      INSERT INTO publisher_tracking_links
      (
        pub_code, publisher_id, publisher_name, name, geo, carrier, type, payout,
        cap_daily, cap_total, hold_percent, landing_page_url,
        tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url,
        operator_pin_send_url, operator_pin_verify_url, operator_status_url, operator_portal_url,
        required_params, status, created_at, updated_at
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
       $18,$19,$20,$21,$22,$23,NOW(),NOW())
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
      required_params ? JSON.stringify(required_params) : null,
      "active",
    ];

    const { rows } = await pool.query(insertQuery, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------
   UPDATE TRACKING LINK — keep operator urls and publisher urls safe
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
      operator_portal_url
    } = req.body;

    // Use COALESCE so nulls in request do not wipe DB
    const query = `
      UPDATE publisher_tracking_links
      SET name = COALESCE($1, name),
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
          updated_at = NOW()
      WHERE id = $18
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
      id
    ];

    const { rows } = await pool.query(query, params);
    if (!rows.length) return res.status(404).json({ error: "Tracking link not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
