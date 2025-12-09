import express from "express";
import axios from "axios";
import InappTemplate from "../models/InappTemplate.js";   // your Mongo model

const router = express.Router();

/* ------------------------------------------------------
    UTILITY — GET TEMPLATE FOR pub_id
------------------------------------------------------ */
async function getTemplate(pub_id) {
  const tpl = await InappTemplate.findOne({ pub_id });
  if (!tpl) throw new Error("Template not found for pub_id " + pub_id);
  return tpl;
}

/* ------------------------------------------------------
    FORMAT URL BASED ON TEMPLATE FIELDS
------------------------------------------------------ */
function buildOperatorURL(base, params) {
  const search = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return `${base}?${search}`;
}

/* ------------------------------------------------------
    SEND PIN
------------------------------------------------------ */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua } = req.query;

    const tpl = await getTemplate(pub_id);

    const operatorParams = {
      pub_id,
      msisdn,
      ip,
      ua,
    };

    const finalURL = buildOperatorURL(tpl.pin_send_url, operatorParams);

    console.log("📡 SENDPIN → Operator URL:", finalURL);

    const operatorRes = await axios.get(finalURL, { timeout: 10000 });

    return res.json({
      success: true,
      operator_url_called: finalURL,
      operator_response: operatorRes.data,
    });
  } catch (err) {
    console.log("🔥 SENDPIN ERROR:", err.message);

    return res.json({
      success: false,
      message: "OTP not sent",
      error: err.message,
    });
  }
});

/* ------------------------------------------------------
    VERIFY PIN
------------------------------------------------------ */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, msisdn, otp, ip, ua } = req.query;

    const tpl = await getTemplate(pub_id);

    const operatorParams = {
      pub_id,
      msisdn,
      otp,
      ip,
      ua,
    };

    const finalURL = buildOperatorURL(tpl.pin_verify_url, operatorParams);

    console.log("📡 VERIFYPIN → Operator URL:", finalURL);

    const operatorRes = await axios.get(finalURL, { timeout: 10000 });

    return res.json({
      success: true,
      operator_url_called: finalURL,
      operator_response: operatorRes.data,
    });
  } catch (err) {
    console.log("🔥 VERIFY ERROR:", err.message);

    return res.json({
      success: false,
      message: "OTP verify failed",
      error: err.message,
    });
  }
});

/* ------------------------------------------------------
    CHECK STATUS
------------------------------------------------------ */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua } = req.query;

    const tpl = await getTemplate(pub_id);

    const operatorParams = {
      pub_id,
      msisdn,
      ip,
      ua,
    };

    const finalURL = buildOperatorURL(tpl.status_url, operatorParams);

    console.log("📡 STATUS → Operator URL:", finalURL);

    const operatorRes = await axios.get(finalURL, { timeout: 10000 });

    return res.json({
      success: true,
      operator_url_called: finalURL,
      operator_response: operatorRes.data,
    });
  } catch (err) {
    console.log("🔥 STATUS ERROR:", err.message);

    return res.json({
      success: false,
      message: "Status check failed",
      error: err.message,
    });
  }
});

/* ------------------------------------------------------
    PORTAL URL (REDIRECT)
------------------------------------------------------ */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua } = req.query;

    const tpl = await getTemplate(pub_id);

    const operatorParams = {
      pub_id,
      msisdn,
      ip,
      ua,
    };

    const finalURL = buildOperatorURL(tpl.portal_url, operatorParams);

    console.log("📡 PORTAL →:", finalURL);

    return res.redirect(finalURL);
  } catch (err) {
    return res.send("Portal redirect failed: " + err.message);
  }
});

export default router;
