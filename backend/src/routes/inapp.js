// routes/inappRoutes.js
import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* -------------------------------------------------------
   Helper: Load publisher tracking + operator mapping
------------------------------------------------------- */
async function loadTracking(pub_id) {
  const q = await pool.query(
    `SELECT 
        pub_code,
        operator_pin_send_url,
        operator_pin_verify_url,
        operator_status_url,
        operator_portal_url,
        required_params
     FROM publisher_tracking_links
     WHERE pub_code = $1 LIMIT 1`,
    [pub_id]
  );

  return q.rows[0] || null;
}

/* -------------------------------------------------------
   Helper: Map publisher params → operator params
------------------------------------------------------- */
function buildOperatorParams(mapping, publisherValues) {
  const operatorParams = {};

  if (!mapping) return operatorParams;
  if (!mapping.operator) return operatorParams;

  const opMap = mapping.operator; // { cid:"click_id", msisdn:"msisdn", ... }

  for (const operatorKey of Object.keys(opMap)) {
    const pubField = opMap[operatorKey]; // e.g. click_id
    if (publisherValues[pubField] !== undefined) {
      operatorParams[operatorKey] = publisherValues[pubField];
    }
  }

  return operatorParams;
}

/* -------------------------------------------------------
   Helper: Call operator URL with GET or POST automatically
------------------------------------------------------- */
async function callOperator(url, params) {
  try {
    // If URL contains ? assume GET
    if (url.includes("?")) {
      const response = await axios.get(url, { params });
      return response.data;
    }

    // Otherwise POST
    const response = await axios.post(url, params);
    return response.data;
  } catch (err) {
    return { success: false, message: "Operator error", error: err.message };
  }
}

/* -------------------------------------------------------
   /inapp/sendpin
------------------------------------------------------- */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua, click_id } = req.query;

    if (!pub_id) return res.json({ success: false, message: "pub_id missing" });

    const data = await loadTracking(pub_id);
    if (!data || !data.operator_pin_send_url)
      return res.json({ success: false, message: "Operator SENDPIN URL missing" });

    // Build operator parameters using mapping
    const operatorParams = buildOperatorParams(data.required_params, {
      msisdn,
      ip,
      ua,
      click_id,
    });

    const operatorResponse = await callOperator(
      data.operator_pin_send_url,
      operatorParams
    );

    res.json({
      success: true,
      operator_url_called: data.operator_pin_send_url,
      operator_params_sent: operatorParams,
      operator_response: operatorResponse
    });

  } catch (err) {
    console.error("SENDPIN ERROR:", err);
    res.json({ success: false, message: err.message });
  }
});

/* -------------------------------------------------------
   /inapp/verifypin
------------------------------------------------------- */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, msisdn, pin, ip, ua, click_id } = req.query;

    const data = await loadTracking(pub_id);
    if (!data || !data.operator_pin_verify_url)
      return res.json({ success: false, message: "Operator VERIFY URL missing" });

    const operatorParams = buildOperatorParams(data.required_params, {
      msisdn,
      ip,
      ua,
      click_id,
      pin
    });

    const operatorResponse = await callOperator(
      data.operator_pin_verify_url,
      operatorParams
    );

    res.json({
      success: true,
      operator_url_called: data.operator_pin_verify_url,
      operator_params_sent: operatorParams,
      operator_response: operatorResponse,
    });

  } catch (err) {
    console.error("VERIFYPIN ERROR:", err);
    res.json({ success: false, message: err.message });
  }
});

/* -------------------------------------------------------
   /inapp/checkstatus
------------------------------------------------------- */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    const data = await loadTracking(pub_id);
    if (!data || !data.operator_status_url)
      return res.json({ success: false, message: "Operator STATUS URL missing" });

    const operatorParams = buildOperatorParams(data.required_params, { msisdn });

    const operatorResponse = await callOperator(
      data.operator_status_url,
      operatorParams
    );

    res.json({
      success: true,
      operator_url_called: data.operator_status_url,
      operator_params_sent: operatorParams,
      operator_response: operatorResponse
    });

  } catch (err) {
    console.error("STATUS ERROR:", err);
    res.json({ success: false, message: err.message });
  }
});

/* -------------------------------------------------------
   /inapp/portal
------------------------------------------------------- */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn, click_id } = req.query;

    const data = await loadTracking(pub_id);
    if (!data || !data.operator_portal_url)
      return res.json({ success: false, message: "Operator PORTAL URL missing" });

    const operatorParams = buildOperatorParams(data.required_params, {
      msisdn,
      click_id
    });

    const operatorResponse = await callOperator(
      data.operator_portal_url,
      operatorParams
    );

    res.json({
      success: true,
      operator_url_called: data.operator_portal_url,
      operator_params_sent: operatorParams,
      operator_response: operatorResponse
    });

  } catch (err) {
    console.error("PORTAL ERROR:", err);
    res.json({ success: false, message: err.message });
  }
});

export default router;
