import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

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
   CREATE NEW TRACKING URL (AUTO PUBxx)
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
      offer_id,
    } = req.body;

    if (!publisher_id || !geo || !carrier) {
      return res.status(400).json({
        error: "publisher_id, geo, and carrier are required",
      });
    }

    // Fetch publisher name
    const pubQuery = await pool.query(
      "SELECT name FROM publishers WHERE id=$1",
      [publisher_id]
    );
    const publisher_name = pubQuery.rows[0]?.name || "Unknown Publisher";

    // Generate next PUBxx
    const last = await pool.query(
      "SELECT pub_code FROM publisher_tracking_links ORDER BY id DESC LIMIT 1"
    );

    let nextPubId = "PUB01";
    if (last.rows.length > 0) {
      const lastCode = parseInt(last.rows[0].pub_code.replace("PUB", ""));
      const newCode = String(lastCode + 1).padStart(2, "0");
      nextPubId = `PUB${newCode}`;
    }

    const base = process.env.BASE_TRACKING_URL || "https://backend.mob13r.com";

    let tracking_url = null,
      pin_send_url = null,
      pin_verify_url = null,
      check_status_url = null,
      portal_url = null,
      required_params = null;

    /* ======================================================
       NON-INAPP TYPE
    ======================================================= */
    if (type !== "INAPP") {
      tracking_url = `${base}/click?pub_id=${nextPubId}&geo=${geo}&carrier=${carrier}`;
    }

    /* ======================================================
       INAPP TYPE
    ======================================================= */
    if (type === "INAPP") {
      if (!offer_id)
        return res.status(400).json({ error: "offer_id is required for INAPP tracking links" });

      const offerRes = await pool.query(
        "SELECT inapp_template_id FROM offers WHERE offer_id=$1",
        [offer_id]
      );

      if (!offerRes.rows.length)
        return res.status(400).json({ error: "Offer not found" });

      const templateId = offerRes.rows[0].inapp_template_id;

      if (!templateId)
        return res.status(400).json({
          error: "This INAPP offer does not have any INAPP template assigned",
        });

      // OUR INTERNAL URLs for publisher → ALWAYS BACKEND ROUTES
      const inapp = `${base}/inapp`;

      pin_send_url = `${inapp}/sendpin?pub_id=${nextPubId}`;
      pin_verify_url = `${inapp}/verifypin?pub_id=${nextPubId}`;
      check_status_url = `${inapp}/checkstatus?pub_id=${nextPubId}`;
      portal_url = `${inapp}/portal?pub_id=${nextPubId}`;

      // AUTO required params
      required_params = {
        ip: true,
        ua: true,
        msisdn: true,
        click_id: true,
        otp: true,
      };
    }

    /* ======================================================
       INSERT RECORD (MATCH EXACT DB COLUMNS)
    ======================================================= */
    const insertQuery = `
      INSERT INTO publisher_tracking_links
      (pub_code, publisher_id, publisher_name, name, geo, carrier, type, payout,
       cap_daily, cap_total, hold_percent, landing_page_url,
       tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url,
       required_params,
       created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())
      RETURNING *;
    `;

    const values = [
      nextPubId,
      publisher_id,
      publisher_name,
      name,
      geo,
      carrier,
      type,
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
      required_params ? JSON.stringify(required_params) : null,
    ];

    const { rows } = await pool.query(insertQuery, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   UPDATE TRACKING LINK
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
    } = req.body;

    const query = `
      UPDATE publisher_tracking_links
      SET name=$1,
          type=$2,
          payout=$3,
          cap_daily=$4,
          cap_total=$5,
          hold_percent=$6,
          landing_page_url=$7,
          status=$8,
          tracking_url=$9,
          pin_send_url=$10,
          pin_verify_url=$11,
          check_status_url=$12,
          portal_url=$13,
          updated_at=NOW()
      WHERE id=$14
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
      tracking_url || null,
      pin_send_url || null,
      pin_verify_url || null,
      check_status_url || null,
      portal_url || null,
      id,
    ];

    const { rows } = await pool.query(query, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
