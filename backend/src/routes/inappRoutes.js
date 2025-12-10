import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* ======================================================
   HELPER: Fetch tracking row by pub_id
====================================================== */
async function getTracking(pub_id) {
  const q = await pool.query(
    "SELECT * FROM publisher_tracking_links WHERE pub_code=$1",
    [pub_id]
  );

  if (!q.rows.length) return null;
  return q.rows[0];
}

/* ======================================================
   HELPER: Build final operator URL with parameters
====================================================== */
function buildFinalUrl(baseUrl, params = {}) {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, v.toString());
    }
  });

  return url.toString();
}

/* ======================================================
   SENDPIN
====================================================== */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua, click_id } = req.query;

    if (!pub_id || !msisdn)
      return res.json({ success: false, message: "pub_id and msisdn required" });

    const track = await getTracking(pub_id);
    if (!track || !track.operator_pin_send_url)
      return res.json({ success: false, message: "Operator SENDPIN URL missing" });

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

    if (!pub_id || !msisdn || !pin)
      return res.json({ success: false, message: "pub_id, msisdn, pin required" });

    const track = await getTracking(pub_id);
    if (!track || !track.operator_pin_verify_url)
      return res.json({ success: false, message: "Operator VERIFYPIN URL missing" });

    const finalUrl = buildFinalUrl(track.operator_pin_verify_url, {
      msisdn,
      pin,
      ip,
      ua,
      click_id
    });

    console.log("📤 VERIFYPIN →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    return res.json(response.data);

  } catch (err) {
    console.error("VERIFYPIN ERROR:", err);
    return res.json({ success: false, error: err.message });
  }
});

/* ======================================================
   CHECK STATUS
====================================================== */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    if (!pub_id || !msisdn)
      return res.json({ success: false, message: "pub_id & msisdn required" });

    const track = await getTracking(pub_id);
    if (!track || !track.operator_status_url)
      return res.json({ success: false, message: "Operator STATUS URL missing" });

    const finalUrl = buildFinalUrl(track.operator_status_url, { msisdn });

    console.log("📤 CHECK STATUS →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    return res.json(response.data);

  } catch (err) {
    console.error("STATUS ERROR:", err);
    return res.json({ success: false, error: err.message });
  }
});

/* ======================================================
   PORTAL REDIRECT
====================================================== */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn, click_id } = req.query;

    if (!pub_id || !msisdn)
      return res.json({ success: false, message: "pub_id & msisdn required" });

    const track = await getTracking(pub_id);
    if (!track || !track.operator_portal_url)
      return res.json({ success: false, message: "Operator PORTAL URL missing" });

    const finalUrl = buildFinalUrl(track.operator_portal_url, {
      msisdn,
      click_id
    });

    console.log("📤 PORTAL →", finalUrl);

    return res.redirect(finalUrl);

  } catch (err) {
    console.error("PORTAL ERROR:", err);
    return res.json({ success: false, error: err.message });
  }
});

export default router;
