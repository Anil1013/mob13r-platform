// routes/inappRoutes.js
import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* ======================================================
   HELPER: fetch tracking row by pub_code (publisher id)
   We intentionally select both operator_* and publisher-facing urls.
====================================================== */
async function getTracking(pub_id) {
  const q = await pool.query(
    `SELECT id, pub_code, pin_send_url, pin_verify_url, check_status_url, portal_url,
            operator_pin_send_url, operator_pin_verify_url, operator_status_url, operator_portal_url,
            required_params
     FROM publisher_tracking_links
     WHERE pub_code = $1
     LIMIT 1`,
    [pub_id]
  );
  return q.rows.length ? q.rows[0] : null;
}

/* ======================================================
   helper to build final operator url:
   - first try to replace placeholders (<msisdn>, <ip>, <ua>, <otp>, <click_id>)
   - then ensure any remaining params are appended as query params
====================================================== */
function buildFinalUrl(templateUrl, params = {}) {
  if (!templateUrl) return null;

  // Replace placeholder tokens if present
  let urlStr = templateUrl;
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    urlStr = urlStr.replace(new RegExp(`<${k}>`, "g"), encodeURIComponent(String(v)));
  });

  // Make into URL and add remaining params as query string safely
  // If templateUrl already has query string (or placeholders used '?'), the URL constructor handles it
  let url;
  try {
    url = new URL(urlStr, "https://backend.mob13r.com"); // base to avoid errors on relative paths
  } catch (err) {
    // fallback: if templateUrl is invalid, return null
    return null;
  }

  // add params as fallback query params (but do not override those already present)
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (!url.searchParams.has(k)) url.searchParams.set(k, String(v));
  });

  // return string without the base if original was relative (so redirects/publisher-facing remain as expected)
  return url.toString();
}

/* ======================================================
   SENDPIN - calls operator sendpin using operator_pin_send_url (preferred)
            - falls back to pin_send_url if operator url not present
====================================================== */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua, click_id } = req.query;
    if (!pub_id || !msisdn) return res.json({ success: false, message: "pub_id and msisdn required" });

    const track = await getTracking(pub_id);
    if (!track) return res.json({ success: false, message: "Tracking not found for pub_id" });

    // choose operator url first (the vendor endpoint), else fallback to publisher-facing (shouldn't be used to call vendor)
    const operatorTemplate = track.operator_pin_send_url || track.pin_send_url;
    if (!operatorTemplate) return res.json({ success: false, message: "Operator SENDPIN URL missing" });

    const finalUrl = buildFinalUrl(operatorTemplate, { msisdn, ip, ua, click_id });
    if (!finalUrl) return res.json({ success: false, message: "Invalid operator SENDPIN template" });

    console.log("📤 SENDPIN →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    return res.json({ success: true, operator_url_called: finalUrl, operator_response: response.data });
  } catch (err) {
    console.error("SENDPIN ERROR:", err);
    return res.json({ success: false, message: "OTP not sent", error: err.message });
  }
});

/* ======================================================
   VERIFYPIN
====================================================== */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, msisdn, pin, ip, ua, click_id } = req.query;
    if (!pub_id || !msisdn || !pin) return res.json({ success: false, message: "pub_id, msisdn, pin required" });

    const track = await getTracking(pub_id);
    if (!track) return res.json({ success: false, message: "Tracking not found" });

    const operatorTemplate = track.operator_pin_verify_url || track.pin_verify_url;
    if (!operatorTemplate) return res.json({ success: false, message: "Operator VERIFYPIN URL missing" });

    // Some operator templates use <otp>, some use "pin" query param — we replace <otp> then append pin as fallback
    const finalUrl = buildFinalUrl(operatorTemplate, { msisdn, otp: pin, ip, ua, click_id });
    if (!finalUrl) return res.json({ success: false, message: "Invalid operator VERIFYPIN template" });

    console.log("📤 VERIFYPIN →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    return res.json({ success: true, operator_url_called: finalUrl, operator_response: response.data });
  } catch (err) {
    console.error("VERIFYPIN ERROR:", err);
    return res.json({ success: false, message: "OTP verify failed", error: err.message });
  }
});

/* ======================================================
   CHECK STATUS
====================================================== */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;
    if (!pub_id || !msisdn) return res.json({ success: false, message: "pub_id & msisdn required" });

    const track = await getTracking(pub_id);
    if (!track) return res.json({ success: false, message: "Tracking not found" });

    const operatorTemplate = track.operator_status_url || track.check_status_url;
    if (!operatorTemplate) return res.json({ success: false, message: "Operator STATUS URL missing" });

    const finalUrl = buildFinalUrl(operatorTemplate, { msisdn });
    if (!finalUrl) return res.json({ success: false, message: "Invalid operator STATUS template" });

    console.log("📤 CHECK STATUS →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    return res.json({ success: true, operator_url_called: finalUrl, operator_response: response.data });
  } catch (err) {
    console.error("CHECK STATUS ERROR:", err);
    return res.json({ success: false, message: "Status check failed", error: err.message });
  }
});

/* ======================================================
   PORTAL REDIRECT (redirects publisher -> operator portal)
====================================================== */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn, click_id } = req.query;
    if (!pub_id || !msisdn) return res.json({ success: false, message: "pub_id & msisdn required" });

    const track = await getTracking(pub_id);
    if (!track) return res.json({ success: false, message: "Tracking not found" });

    const operatorTemplate = track.operator_portal_url || track.portal_url;
    if (!operatorTemplate) return res.json({ success: false, message: "Operator PORTAL URL missing" });

    const finalUrl = buildFinalUrl(operatorTemplate, { msisdn, click_id });
    if (!finalUrl) return res.json({ success: false, message: "Invalid operator PORTAL template" });

    console.log("📤 PORTAL REDIRECT →", finalUrl);

    // Use a 302 redirect to operator portal
    return res.redirect(finalUrl);
  } catch (err) {
    console.error("PORTAL ERROR:", err);
    return res.json({ success: false, message: "Portal redirect failed", error: err.message });
  }
});

export default router;
