import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* =======================================================
   🔍 LOAD TEMPLATE FROM publisher_tracking_links
======================================================= */
async function getTemplate(pub_id) {
  const q = `
    SELECT pin_send_url, pin_verify_url, check_status_url, portal_url, required_params
    FROM publisher_tracking_links
    WHERE pub_code = $1
  `;
  const result = await pool.query(q, [pub_id]);

  if (!result.rows.length) {
    throw new Error("No INAPP template found for pub_id " + pub_id);
  }

  return result.rows[0];
}

/* =======================================================
   🔧 Build Operator URL
======================================================= */
function buildURL(base, params) {
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${base}?${qs}`;
}

/* =======================================================
   📌 SEND PIN
======================================================= */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, user_ip, ua } = req.query;

    const tpl = await getTemplate(pub_id);

    const operatorParams = {
      pub_id,
      msisdn,
      ip: user_ip,
      ua,
    };

    const finalURL = buildURL(tpl.pin_send_url, operatorParams);

    console.log("📡 SENDPIN →", finalURL);

    const response = await axios.get(finalURL, { timeout: 10000 });

    return res.json({
      success: true,
      operator_url_called: finalURL,
      operator_response: response.data,
    });
  } catch (err) {
    console.log("❌ SENDPIN ERROR:", err.message);

    return res.json({
      success: false,
      message: "OTP not sent",
      error: err.message,
    });
  }
});

/* =======================================================
   🔐 VERIFY PIN
======================================================= */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, msisdn, pin, user_ip, ua } = req.query;

    const tpl = await getTemplate(pub_id);

    const operatorParams = {
      pub_id,
      msisdn,
      pin,
      ip: user_ip,
      ua,
    };

    const finalURL = buildURL(tpl.pin_verify_url, operatorParams);

    console.log("📡 VERIFYPIN →", finalURL);

    const response = await axios.get(finalURL, { timeout: 10000 });

    return res.json({
      success: true,
      operator_url_called: finalURL,
      operator_response: response.data,
    });
  } catch (err) {
    console.log("❌ VERIFY ERROR:", err.message);

    return res.json({
      success: false,
      message: "OTP verify failed",
      error: err.message,
    });
  }
});

/* =======================================================
   📊 STATUS CHECK
======================================================= */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    const tpl = await getTemplate(pub_id);

    const operatorParams = {
      pub_id,
      msisdn,
    };

    const finalURL = buildURL(tpl.check_status_url, operatorParams);

    console.log("📡 STATUS →", finalURL);

    const response = await axios.get(finalURL, { timeout: 10000 });

    return res.json({
      success: true,
      operator_url_called: finalURL,
      operator_response: response.data,
    });
  } catch (err) {
    console.log("❌ STATUS ERROR:", err.message);

    return res.json({
      success: false,
      message: "Status check failed",
      error: err.message,
    });
  }
});

/* =======================================================
   🌐 PORTAL REDIRECT
======================================================= */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    const tpl = await getTemplate(pub_id);

    const operatorParams = {
      pub_id,
      msisdn,
    };

    const finalURL = buildURL(tpl.portal_url, operatorParams);

    console.log("📡 PORTAL →", finalURL);

    return res.redirect(finalURL);
  } catch (err) {
    res.send("Portal redirect failed: " + err.message);
  }
});

export default router;
