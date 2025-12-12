// routes/inapp.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

// Memory store → saves SendPin operator response per click_id
const sendPinMemory = {}; // { click_id: { sessionKey: "12345", ... } }

/* --------------------------------------------------------
   Helper: Load Publisher
--------------------------------------------------------- */
async function loadPublisher(pub_id) {
  const q = await pool.query(
    `SELECT * FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1`,
    [pub_id]
  );
  return q.rows[0] || null;
}

/* --------------------------------------------------------
   Helper: Build Operator Parameter Payload
--------------------------------------------------------- */
function buildParams(mapping, src, fixed = {}, carry = {}) {
  const final = {};

  // 1. Map dynamic parameters
  for (const operatorKey in mapping) {
    const userKey = mapping[operatorKey];
    if (src[userKey] !== undefined && src[userKey] !== null) {
      final[operatorKey] = src[userKey];
    }
  }

  // 2. Add fixed parameters (template.fixed)
  Object.assign(final, fixed);

  // 3. Add carryover values from sendpin (like sessionKey)
  Object.assign(final, carry);

  return final;
}

/* --------------------------------------------------------
   Helper: Convert object → query string
--------------------------------------------------------- */
function toQueryString(obj = {}) {
  const qs = new URLSearchParams();
  for (const key in obj) {
    qs.append(key, obj[key]);
  }
  return qs.toString();
}

/* --------------------------------------------------------
   SEND PIN
--------------------------------------------------------- */
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

    if (!operatorUrl)
      return res.json({
        success: false,
        message: "Operator SendPin URL missing",
      });

    // Build request parameters
    const publisherData = { ...req.query };
    const finalParams = buildParams(mapping, publisherData, fixed, {});

    let operatorResp;
    let fullUrl = operatorUrl;

    if (mode === "GET") {
      const qs = toQueryString(finalParams);
      fullUrl = `${operatorUrl}?${qs}`;
      operatorResp = await axios.get(fullUrl, { timeout: 8000 });

      console.log("📡 SENDPIN GET →", fullUrl);
    } else {
      operatorResp = await axios.post(operatorUrl, finalParams, {
        timeout: 8000,
      });

      console.log("📡 SENDPIN POST →", operatorUrl, finalParams);
    }

    // Save operator response for verifypin
    if (click_id) {
      sendPinMemory[click_id] = operatorResp.data || {};
    }

    return res.json({
      success: true,
      mode,
      operator_url_called: fullUrl,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data,
    });
  } catch (err) {
    console.error("SENDPIN ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

/* --------------------------------------------------------
   VERIFY PIN
--------------------------------------------------------- */
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

    if (!operatorUrl)
      return res.json({
        success: false,
        message: "Operator VerifyPin URL missing",
      });

    const publisherData = { ...req.query };

    // Carry-over values from SendPin (sessionKey, trx_id, etc.)
    const carry = sendPinMemory[click_id] || {};

    // Build final verify payload
    const finalParams = buildParams(mapping, publisherData, fixed, carry);

    let operatorResp;
    let fullUrl = operatorUrl;

    if (mode === "GET") {
      const qs = toQueryString(finalParams);
      fullUrl = `${operatorUrl}?${qs}`;
      operatorResp = await axios.get(fullUrl, { timeout: 8000 });

      console.log("📡 VERIFYPIN GET →", fullUrl);
    } else {
      operatorResp = await axios.post(operatorUrl, finalParams, {
        timeout: 8000,
      });

      console.log("📡 VERIFYPIN POST →", operatorUrl, finalParams);
    }

    return res.json({
      success: true,
      mode,
      operator_url_called: fullUrl,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data,
    });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

export default router;
