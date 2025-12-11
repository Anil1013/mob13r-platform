// File: routes/inappRoutes.js

import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* ======================================================
   HELPER: Fetch tracking row using PUB ID
====================================================== */
async function getTracking(pub_id) {
  const q = await pool.query(
    "SELECT * FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
    [pub_id]
  );
  return q.rows.length ? q.rows[0] : null;
}

/* ======================================================
   HELPER: Replace placeholders (<msisdn>, <ip> etc.)
          AND append final query parameters safely
====================================================== */
function buildFinalUrl(baseUrl, params = {}) {
  let url = baseUrl;

  // Replace template placeholders (<msisdn>, <ip>, <ua>, <otp>, <click_id>)
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    url = url.replace(`<${key}>`, encodeURIComponent(value));
  });

  // Now append query params properly
  const finalUrl = new URL(url);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      finalUrl.searchParams.set(key, value.toString());
    }
  });

  return finalUrl.toString();
}

/* ======================================================
   SENDPIN
====================================================== */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua, click_id } = req.query;

    if (!pub_id || !msisdn) {
      return res.json({ success: false, message: "pub_id and msisdn are required" });
    }

    const track = await getTracking(pub_id);
    if (!track || !track.pin_send_url) {
      return res.json({ success: false, message: "Operator SENDPIN URL missing" });
    }

    const finalUrl = buildFinalUrl(track.operator_pin_send_url, {
      msisdn,
      ip,
      ua,
      click_id
    });

    console.log("📤 SENDPIN →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    return res.json(response.data);

  } catch (err) {
    console.error("SENDPIN ERROR:", err.message);
    return res.json({ success: false, message: "OTP not sent", error: err.message });
  }
});

/* ======================================================
   VERIFYPIN
====================================================== */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, msisdn, pin, ip, ua, click_id } = req.query;

    if (!pub_id || !msisdn || !pin) {
      return res.json({ success: false, message: "pub_id, msisdn, pin required" });
    }

    const track = await getTracking(pub_id);
    if (!track || !track.operator_pin_verify_url) {
      return res.json({ success: false, message: "Operator VERIFYPIN URL missing" });
    }

    const finalUrl = buildFinalUrl(track.operator_pin_verify_url, {
      msisdn,
      otp: pin, // backend uses <otp> placeholder
      ip,
      ua,
      click_id
    });

    console.log("📤 VERIFYPIN →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    return res.json(response.data);

  } catch (err) {
    console.error("VERIFYPIN ERROR:", err.message);
    return res.json({ success: false, error: err.message });
  }
});

/* ======================================================
   CHECK STATUS
====================================================== */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    if (!pub_id || !msisdn) {
      return res.json({ success: false, message: "pub_id & msisdn required" });
    }

    const track = await getTracking(pub_id);
    if (!track || !track.operator_status_url) {
      return res.json({ success: false, message: "Operator STATUS URL missing" });
    }

    const finalUrl = buildFinalUrl(track.operator_status_url, {
      msisdn
    });

    console.log("📤 CHECK STATUS →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    return res.json(response.data);

  } catch (err) {
    console.error("CHECK STATUS ERROR:", err.message);
    return res.json({ success: false, error: err.message });
  }
});

/* ======================================================
   PORTAL REDIRECT
====================================================== */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn, click_id } = req.query;

    if (!pub_id || !msisdn) {
      return res.json({ success: false, message: "pub_id & msisdn required" });
    }

    const track = await getTracking(pub_id);
    if (!track || !track.operator_portal_url) {
      return res.json({ success: false, message: "Operator PORTAL URL missing" });
    }

    const finalUrl = buildFinalUrl(track.operator_portal_url, {
      msisdn,
      click_id
    });

    console.log("📤 PORTAL REDIRECT →", finalUrl);

    return res.redirect(finalUrl);

  } catch (err) {
    console.error("PORTAL ERROR:", err.message);
    return res.json({ success: false, error: err.message });
  }
});

export default router;
