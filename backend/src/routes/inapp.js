// routes/inapp.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

// Memory store → used to pass operator response from sendpin → verifypin
const sendPinMemory = {};

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
   Helper: Build Operator Parameters
--------------------------------------------------------- */
function buildParams(mapping, publisherData, fixed = {}, carry = {}) {
  const final = {};

  // Mapped parameters
  for (const operatorKey in mapping) {
    const pubKey = mapping[operatorKey];
    if (publisherData[pubKey] !== undefined) {
      final[operatorKey] = publisherData[pubKey];
    }
  }

  // Add fixed template params
  Object.assign(final, fixed);

  // Add carryover (sessionKey, trxId, etc.)
  Object.assign(final, carry);

  return final;
}

/* --------------------------------------------------------
   Helper: Convert Params → Query String
--------------------------------------------------------- */
function toQueryString(params = {}) {
  const q = new URLSearchParams();
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null) {
      q.append(key, params[key]);
    }
  }
  return q.toString();
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
    const mode = template.mode || "GET"; // Default GET for operator

    const mapping = template.sendpin || {};
    const fixed = template.fixed || {};

    const operatorUrl = publisher.operator_pin_send_url;
    if (!operatorUrl)
      return res.json({ success: false, message: "Operator SendPin URL missing" });

    const publisherData = { ...req.query };

    // Build final operator params
    const finalParams = buildParams(mapping, publisherData, fixed, {});

    let operatorResp;

    /* ------------------ GET MODE ------------------ */
    if (mode === "GET") {
      const qs = toQueryString(finalParams);
      const fullUrl = `${operatorUrl}?${qs}`;

      console.log("📡 SENDPIN GET =>", fullUrl);

      operatorResp = await axios.get(fullUrl, { timeout: 10000 });

      // Save for verify
      if (click_id) sendPinMemory[click_id] = operatorResp.data || {};

      return res.json({
        success: true,
        mode: "GET",
        operator_url_called: fullUrl,
        operator_params_sent: finalParams,
        operator_response: operatorResp.data
      });
    }

    /* ------------------ POST MODE ------------------ */
    operatorResp = await axios.post(operatorUrl, finalParams, { timeout: 10000 });

    console.log("📡 SENDPIN POST =>", operatorUrl, finalParams);

    if (click_id) sendPinMemory[click_id] = operatorResp.data || {};

    return res.json({
      success: true,
      mode: "POST",
      operator_url_called: operatorUrl,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data
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
    const mode = template.mode || "GET";

    const mapping = template.verifypin || {};
    const fixed = template.fixed || {};

    const operatorUrl = publisher.operator_pin_verify_url;
    if (!operatorUrl)
      return res.json({ success: false, message: "Operator VerifyPin URL missing" });

    const publisherData = { ...req.query };

    // Load carry-over (sessionKey, trxId, etc.)
    const carry = sendPinMemory[click_id] || {};

    // Build verify params
    const finalParams = buildParams(mapping, publisherData, fixed, carry);

    let operatorResp;

    /* ------------------ GET MODE ------------------ */
    if (mode === "GET") {
      const qs = toQueryString(finalParams);
      const fullUrl = `${operatorUrl}?${qs}`;

      console.log("📡 VERIFYPIN GET =>", fullUrl);

      operatorResp = await axios.get(fullUrl, { timeout: 10000 });

      return res.json({
        success: true,
        mode: "GET",
        operator_url_called: fullUrl,
        operator_params_sent: finalParams,
        operator_response: operatorResp.data
      });
    }

    /* ------------------ POST MODE ------------------ */
    operatorResp = await axios.post(operatorUrl, finalParams, { timeout: 10000 });

    console.log("📡 VERIFYPIN POST =>", operatorUrl, finalParams);

    return res.json({
      success: true,
      mode: "POST",
      operator_url_called: operatorUrl,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

export default router;
