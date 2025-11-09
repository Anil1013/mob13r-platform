import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* =========================================================
   🟢 GET all publisher tracking URLs (with filters)
   ========================================================= */
router.get("/", authJWT, async (req, res) => {
  try {
    const { pub_id, geo, carrier, name, type } = req.query;

    let q = `
      SELECT 
        ptl.*, 
        pub.name AS publisher_name
      FROM publisher_tracking_links ptl
      LEFT JOIN publishers pub ON pub.pub_id = ptl.pub_id
      WHERE 1=1
    `;

    const params = [];

    if (pub_id) {
      params.push(pub_id);
      q += ` AND ptl.pub_id = $${params.length}`;
    }
    if (geo) {
      params.push(geo);
      q += ` AND ptl.geo = $${params.length}`;
    }
    if (carrier) {
      params.push(carrier);
      q += ` AND ptl.carrier = $${params.length}`;
    }
    if (name) {
      params.push(`%${name}%`);
      q += ` AND LOWER(ptl.name) LIKE LOWER($${params.length})`;
    }
    if (type) {
      params.push(type);
      q += ` AND ptl.type = $${params.length}`;
    }

    q += " ORDER BY ptl.id DESC";

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   🟡 CREATE new publisher tracking link
   ========================================================= */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      pub_id,
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

    if (!pub_id || !geo || !carrier)
      return res
        .status(400)
        .json({ error: "pub_id, geo, and carrier are required" });

    // ✅ Fix column name for publisher lookup
    const pubQ = await pool.query("SELECT name FROM publishers WHERE pub_id=$1", [
      pub_id,
    ]);
    const publisher_name = pubQ.rows[0]?.name || null;

    // ✅ Correct base URL configuration
    const baseTracking = "https://backend.mob13r.com";
    const dashboardDomain = "https://dashboard.mob13r.com";

    let trackingUrl = null,
      pinSendUrl = null,
      pinVerifyUrl = null,
      checkStatusUrl = null,
      portalUrl = null;

    if (type === "INAPP") {
      pinSendUrl = `${baseTracking}/inapp/sendpin?pub_id=${pub_id}&geo=${geo}&carrier=${carrier}&msisdn=<coll_msisdn>&user_ip=<coll_userip>&ua=<coll_ua>`;
      pinVerifyUrl = `${baseTracking}/inapp/verifypin?pub_id=${pub_id}&geo=${geo}&carrier=${carrier}&msisdn=<coll_msisdn>&user_ip=<coll_userip>&ua=<coll_ua>`;
      checkStatusUrl = `${baseTracking}/inapp/checkstatus?pub_id=${pub_id}&geo=${geo}&carrier=${carrier}&msisdn=<coll_msisdn>`;
      portalUrl = `${baseTracking}/inapp/portal?pub_id=${pub_id}`;
    } else {
      trackingUrl = `${baseTracking}/click?pub_id=${pub_id}&geo=${geo}&carrier=${carrier}`;
    }

    const q = await pool.query(
      `INSERT INTO publisher_tracking_links (
        pub_id, publisher_name, name, geo, carrier, type, payout,
        cap_daily, cap_total, hold_percent, landing_page_url,
        tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url,
        created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
      RETURNING *`,
      [
        pub_id,
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
        trackingUrl,
        pinSendUrl,
        pinVerifyUrl,
        checkStatusUrl,
        portalUrl,
      ]
    );

    res.status(201).json(q.rows[0]);
  } catch (err) {
    console.error("POST /api/tracking error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   🟠 UPDATE tracking link
   ========================================================= */
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

    const q = await pool.query(
      `UPDATE publisher_tracking_links
       SET name=$1, type=$2, payout=$3, cap_daily=$4, cap_total=$5,
           hold_percent=$6, landing_page_url=$7, status=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [
        name,
        type,
        payout,
        cap_daily,
        cap_total,
        hold_percent,
        landing_page_url,
        status,
        id,
      ]
    );

    res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /api/tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   🔴 DELETE tracking link
   ========================================================= */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM publisher_tracking_links WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/tracking/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
