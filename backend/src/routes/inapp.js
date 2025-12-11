import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* Load operator template */
async function getTracking(pub_id) {
  const q = await pool.query(
    "SELECT operator_pin_send_url, operator_pin_verify_url, operator_status_url, operator_portal_url, required_params FROM publisher_tracking_links WHERE pub_code=$1",
    [pub_id]
  );
  return q.rows.length ? q.rows[0] : null;
}

/* Build operator URL dynamically */
function buildUrl(baseUrl, requiredParams, incomingParams) {
  const url = new URL(baseUrl);

  Object.keys(requiredParams || {}).forEach((key) => {
    if (incomingParams[key] !== undefined) {
      url.searchParams.set(key, incomingParams[key]);
    }
  });

  return url.toString();
}

/* -------- SEND PIN -------- */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, ...allParams } = req.query;

    const track = await getTracking(pub_id);
    if (!track?.operator_pin_send_url)
      return res.json({ success: false, message: "SENDPIN URL missing" });

    const finalUrl = buildUrl(
      track.operator_pin_send_url,
      track.required_params,
      allParams
    );

    console.log("SENDPIN →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    res.json({ success: true, operator_url_called: finalUrl, operator_response: response.data });

  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

/* -------- VERIFY PIN -------- */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, ...allParams } = req.query;

    const track = await getTracking(pub_id);
    if (!track?.operator_pin_verify_url)
      return res.json({ success: false, message: "VERIFYPIN URL missing" });

    const finalUrl = buildUrl(
      track.operator_pin_verify_url,
      track.required_params,
      allParams
    );

    console.log("VERIFYPIN →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    res.json({ success: true, operator_url_called: finalUrl, operator_response: response.data });

  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

/* -------- STATUS -------- */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, ...allParams } = req.query;

    const track = await getTracking(pub_id);
    if (!track?.operator_status_url)
      return res.json({ success: false, message: "STATUS URL missing" });

    const finalUrl = buildUrl(
      track.operator_status_url,
      track.required_params,
      allParams
    );

    console.log("STATUS →", finalUrl);

    const response = await axios.get(finalUrl, { timeout: 15000 });
    res.json({ success: true, operator_url_called: finalUrl, operator_response: response.data });

  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

/* -------- PORTAL -------- */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, ...allParams } = req.query;

    const track = await getTracking(pub_id);
    if (!track?.operator_portal_url)
      return res.json({ success: false, message: "PORTAL URL missing" });

    const finalUrl = buildUrl(
      track.operator_portal_url,
      track.required_params,
      allParams
    );

    console.log("PORTAL →", finalUrl);
    res.redirect(finalUrl);

  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

export default router;
