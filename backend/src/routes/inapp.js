// routes/inapp.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

// Memory store: SENDPIN → VERIFYPIN
const sendPinMemory = {}; // key = click_id

/* ============================================================
   SAFE ERROR PARSER (NO CIRCULAR JSON)
   Extracts "xxx is missing" from operator response
============================================================ */
function parseOperatorError(err) {
  try {
    let text = "";

    if (err?.response?.data) {
      if (typeof err.response.data === "string") {
        text = err.response.data.toLowerCase();
      } else {
        text = JSON.stringify(err.response.data).toLowerCase();
      }
    }

    if (!text && err.message) {
      text = err.message.toLowerCase();
    }

    const match = text.match(/"([a-z0-9_]+)"\s+is\s+missing/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

/* ============================================================
   Load Publisher Tracking Row
============================================================ */
async function loadPublisher(pub_id) {
  const q = await pool.query(
    `SELECT * FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1`,
    [pub_id]
  );
  return q.rows[0] || null;
}

/* ============================================================
   Parameter Builder (Template System)
============================================================ */
function buildParams(mapping, publisherData, hardcoded = {}, carry = {}) {
  const final = {};

  // 1. Take mapped values from publisher request
  for (const operatorKey in mapping) {
    const pubKey = mapping[operatorKey];
    if (publisherData[pubKey] !== undefined) {
      final[operatorKey] = publisherData[pubKey];
    }
  }

  // 2. Add template fixed values
  Object.assign(final, hardcoded);

  // 3. Add sendpin carry-over (session_id, trx_id, ref_code…)
  Object.assign(final, carry);

  return final;
}

/* ============================================================
   SENDPIN
============================================================ */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    if (!publisher.operator_pin_send_url)
      return res.json({
        success: false,
        message: "Operator SENDPIN URL missing",
      });

    const template = publisher.operator_parameters || {};
    const mapping = template.sendpin || {};
    const hardcoded = template.fixed || {};

    // Build final params
    const finalParams = buildParams(mapping, req.query, hardcoded, {});

    console.log(
      "📤 SENDPIN ->",
      publisher.operator_pin_send_url,
      "params:",
      finalParams
    );

    // CALL OPERATOR
    const operatorResp = await axios.post(
      publisher.operator_pin_send_url,
      finalParams,
      { timeout: 8000 }
    );

    // SAVE MEMORY FOR VERIFYPIN
    if (click_id) sendPinMemory[click_id] = operatorResp.data || {};

    return res.json({
      success: true,
      operator_url_called: publisher.operator_pin_send_url,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data,
    });
  } catch (err) {
    console.error("SENDPIN ERROR:", err.message);

    return res.json({
      success: false,
      error_type: "sendpin_failed",
      missing_key: parseOperatorError(err),
      message: err.message,
    });
  }
});

/* ============================================================
   VERIFYPIN
============================================================ */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    if (!publisher.operator_pin_verify_url)
      return res.json({
        success: false,
        message: "Operator VERIFYPIN URL missing",
      });

    const template = publisher.operator_parameters || {};
    const mapping = template.verifypin || {};
    const hardcoded = template.fixed || {};
    const carry = sendPinMemory[click_id] || {};

    // Build final params
    const finalParams = buildParams(mapping, req.query, hardcoded, carry);

    console.log(
      "📤 VERIFYPIN ->",
      publisher.operator_pin_verify_url,
      "params:",
      finalParams
    );

    // CALL OPERATOR
    const operatorResp = await axios.post(
      publisher.operator_pin_verify_url,
      finalParams,
      { timeout: 8000 }
    );

    return res.json({
      success: true,
      operator_url_called: publisher.operator_pin_verify_url,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data,
    });
  } catch (err) {
    console.error("VERIFYPIN ERROR:", err.message);

    return res.json({
      success: false,
      error_type: "verifypin_failed",
      missing_key: parseOperatorError(err),
      message: err.message,
    });
  }
});

/* ============================================================
   CHECK STATUS
============================================================ */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    if (!publisher.operator_status_url)
      return res.json({
        success: false,
        message: "Operator STATUS URL missing",
      });

    const operatorResp = await axios.get(
      `${publisher.operator_status_url}?msisdn=${msisdn}`,
      { timeout: 8000 }
    );

    return res.json({
      success: true,
      operator_url_called: publisher.operator_status_url,
      operator_response: operatorResp.data,
    });
  } catch (err) {
    return res.json({
      success: false,
      error_type: "status_failed",
      message: err.message,
    });
  }
});

/* ============================================================
   PORTAL REDIRECT
============================================================ */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    if (!publisher.operator_portal_url)
      return res.json({
        success: false,
        message: "Operator PORTAL URL missing",
      });

    const redirect =
      `${publisher.operator_portal_url}?msisdn=${msisdn}&click_id=${click_id}`;

    return res.redirect(redirect);
  } catch (err) {
    return res.json({
      success: false,
      error_type: "portal_failed",
      message: err.message,
    });
  }
});

export default router;
