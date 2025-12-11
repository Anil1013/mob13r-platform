// routes/inappRoutes.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

/* ======================================================
   Helper: Build Operator Parameters
   - If value matches publisher param → replace dynamically
   - If value is constant (like "6") → send as-is
====================================================== */
function buildOperatorParams(operatorParams, publisherInput) {
  const finalParams = {};

  for (const operatorKey in operatorParams) {
    const mapValue = operatorParams[operatorKey];

    // Case 1: mapping exists → take from publisher data
    if (publisherInput[mapValue]) {
      finalParams[operatorKey] = publisherInput[mapValue];
    }
    // Case 2: fixed constant → send as-is
    else {
      finalParams[operatorKey] = mapValue;
    }
  }

  return finalParams;
}

/* ======================================================
   SEND PIN
====================================================== */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua, click_id } = req.query;

    const q = await pool.query(
      "SELECT operator_pin_send_url, operator_parameters FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
      [pub_id]
    );

    if (!q.rows.length) {
      return res.status(400).json({ error: "Invalid pub_id" });
    }

    const { operator_pin_send_url, operator_parameters } = q.rows[0];

    // Build parameters for operator
    const publisherInput = { msisdn, ip, ua, click_id, pin: req.query.pin };
    const operatorParams = buildOperatorParams(operator_parameters, publisherInput);

    const fullUrl = operator_pin_send_url;
    const operatorResp = await axios.get(fullUrl, { params: operatorParams });

    return res.json({
      success: true,
      operator_url_called: fullUrl,
      operator_params_sent: operatorParams,
      operator_response: operatorResp.data
    });
  } catch (err) {
    console.error("SENDPIN error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   VERIFY PIN
====================================================== */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, msisdn, pin, ip, ua, click_id } = req.query;

    const q = await pool.query(
      "SELECT operator_pin_verify_url, operator_parameters FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
      [pub_id]
    );

    const data = q.rows[0];

    const publisherInput = { msisdn, pin, ip, ua, click_id };
    const operatorParams = buildOperatorParams(data.operator_parameters, publisherInput);

    const operatorResp = await axios.get(data.operator_pin_verify_url, { params: operatorParams });

    return res.json({
      success: true,
      operator_url_called: data.operator_pin_verify_url,
      operator_params_sent: operatorParams,
      operator_response: operatorResp.data
    });
  } catch (err) {
    console.error("VERIFYPIN error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   CHECK STATUS
====================================================== */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    const q = await pool.query(
      "SELECT operator_status_url, operator_parameters FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
      [pub_id]
    );

    const data = q.rows[0];

    const publisherInput = { msisdn };
    const operatorParams = buildOperatorParams(data.operator_parameters, publisherInput);

    const operatorResp = await axios.get(data.operator_status_url, { params: operatorParams });

    return res.json({
      success: true,
      operator_params_sent: operatorParams,
      operator_response: operatorResp.data
    });
  } catch (err) {
    console.error("STATUS error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   PORTAL REDIRECT
====================================================== */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn, click_id } = req.query;

    const q = await pool.query(
      "SELECT operator_portal_url, operator_parameters FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
      [pub_id]
    );

    const data = q.rows[0];

    const publisherInput = { msisdn, click_id };
    const operatorParams = buildOperatorParams(data.operator_parameters, publisherInput);

    return res.redirect(data.operator_portal_url + "?" + new URLSearchParams(operatorParams).toString());
  } catch (err) {
    console.error("PORTAL error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
