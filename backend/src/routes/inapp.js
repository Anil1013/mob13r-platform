// routes/inapp.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();
const sendPinMemory = {}; // auto-store operator values

/* Load publisher */
async function loadPublisher(pub_id) {
  const q = await pool.query(
    `SELECT * FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1`,
    [pub_id]
  );
  return q.rows[0] || null;
}

/* Build mapped params */
function buildParams(mapping, publisherData, fixed = {}, carry = {}) {
  const final = {};

  // mapped parameters (template-defined)
  for (const operatorKey in mapping) {
    const pubKey = mapping[operatorKey];
    if (publisherData[pubKey]) final[operatorKey] = publisherData[pubKey];
    if (carry[pubKey]) final[operatorKey] = carry[pubKey];
  }

  // always include ALL carry-over values (auto)
  Object.assign(final, carry);

  // add fixed values
  Object.assign(final, fixed);

  return final;
}

/* Convert params to query string */
function toQueryString(params = {}) {
  const q = new URLSearchParams();
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null)
      q.append(key, params[key]);
  }
  return q.toString();
}

/* ---------------------- SEND PIN ---------------------- */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    const template = publisher.operator_parameters || {};
    const mode = template.mode || "POST";

    const mapping = template.sendpin || {};
    const fixed = template.fixed || {};

    const operatorUrl = publisher.operator_pin_send_url;

    const publisherData = { ...req.query };

    const finalParams = buildParams(mapping, publisherData, fixed, {});

    let operatorResp;

    if (mode === "GET") {
      const fullUrl = `${operatorUrl}?${toQueryString(finalParams)}`;
      operatorResp = await axios.get(fullUrl);

      if (click_id) sendPinMemory[click_id] = { ...(operatorResp.data || {}) };

      return res.json({
        success: true,
        mode,
        operator_url_called: fullUrl,
        operator_params_sent: finalParams,
        operator_response: operatorResp.data
      });

    } else {
      operatorResp = await axios.post(operatorUrl, finalParams);

      if (click_id) sendPinMemory[click_id] = { ...(operatorResp.data || {}) };

      return res.json({
        success: true,
        mode,
        operator_url_called: operatorUrl,
        operator_params_sent: finalParams,
        operator_response: operatorResp.data
      });
    }

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

/* ---------------------- VERIFY PIN ---------------------- */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    const template = publisher.operator_parameters || {};
    const mode = template.mode || "POST";

    const mapping = template.verifypin || {};
    const fixed = template.fixed || {};

    const operatorUrl = publisher.operator_pin_verify_url;

    const publisherData = { ...req.query };

    // ⬇ AUTO-FORWARD ALL operator data including sessionKey
    const carry = sendPinMemory[click_id] || {};

    const finalParams = buildParams(mapping, publisherData, fixed, carry);

    let operatorResp;

    if (mode === "GET") {
      const fullUrl = `${operatorUrl}?${toQueryString(finalParams)}`;
      operatorResp = await axios.get(fullUrl);

      return res.json({
        success: true,
        mode,
        operator_url_called: fullUrl,
        operator_params_sent: finalParams,
        operator_response: operatorResp.data
      });

    } else {
      operatorResp = await axios.post(operatorUrl, finalParams);

      return res.json({
        success: true,
        mode,
        operator_url_called: operatorUrl,
        operator_params_sent: finalParams,
        operator_response: operatorResp.data
      });
    }

  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
});

export default router;
