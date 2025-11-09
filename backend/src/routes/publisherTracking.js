import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   🟢 GET ALL TRACKING LINKS
   ====================================================== */
router.get("/", authJWT, async (req, res) => {
  try {
    const { publisher_id, geo, carrier, name, type } = req.query;

    let query = `
      SELECT ptl.*, pub.name AS publisher_name_db
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
   🟡 CREATE NEW TRACKING URL
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
    } = req.body;

    if (!publisher_id || !geo || !carrier) {
      return res.status(400).json({ error: "publisher_id, geo, and carrier are required" });
    }

    // Fetch publisher name
    const pubQuery = await pool.query("SELECT name FROM publishers WHERE id=$1", [publisher_id]);
    const publisher_name = pubQuery.rows[0]?.name || "Unknown Publisher";

    // Base domain for tracking URLs
    const base = process.env.BASE_TRACKING_URL || "https://backend.mob13r.com";

    // URLs initialization
    let tracking_url = null;
    let pin_send_url = null;
    let pin_verify_url = null;
    let check_status_url = null;
    let portal_url = null;

    if (type === "INAPP") {
      // INAPP Type URLs
      pin_send_url = `${base}/inapp/sendpin?pub_id=PUB${publisher_id}&geo=${geo}&carrier=${carrier}&msisdn=<coll_msisdn>&user_ip=<coll_userip>&ua=<coll_ua>`;
      pin_verify_url = `${base}/inapp/verifypin?pub_id=PUB${publisher_id}&geo=${geo}&carrier=${carrier}&msisdn=<coll_msisdn>&user_ip=<coll_userip>&ua=<coll_ua>`;
      check_status_url = `${base}/inapp/checkstatus?pub_id=PUB${publisher_id}&geo=${geo}&carrier=${carrier}&msisdn=<coll_msisdn>`;
      portal_url = `${base}/inapp/portal?pub_id=PUB${publisher_id}`;
    } else {
      // Default CPA/CPI/CPL/CPS URL
      tracking_url = `${base}/click?pub_id=PUB${publisher_id}&geo=${geo}&carrier=${carrier}`;
    }

    // Insert tracking configuration
    const insertQuery = `
      INSERT INTO publisher_tracking_links
      (publisher_id, publisher_name, name, geo, carrier, type, payout, cap_daily, cap_total, hold_percent,
       landing_page_url, tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url,
       created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
      RETURNING *;
    `;

    const values = [
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
    ];

    const { rows } = await pool.query(insertQuery, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟠 UPDATE TRACKING LINK
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
    } = req.body;

    const updateQuery = `
      UPDATE publisher_tracking_links
      SET name=$1, type=$2, payout=$3, cap_daily=$4, cap_total=$5,
          hold_percent=$6, landing_page_url=$7, status=$8, updated_at=NOW()
      WHERE id=$9 RETURNING *;
    `;

    const { rows } = await pool.query(updateQuery, [
      name,
      type,
      payout,
      cap_daily,
      cap_total,
      hold_percent,
      landing_page_url,
      status,
      id,
    ]);

    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🔴 DELETE TRACKING LINK
   ====================================================== */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM publisher_tracking_links WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
