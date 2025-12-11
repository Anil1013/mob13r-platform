// routes/inappRoutes.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

// memory for sendpin → verify carryover
const sendPinMemory = {}; // click_id → operator response

/* ----------------------------------------------
   Load Publisher Config
---------------------------------------------- */
async function loadPublisher(pub_id) {
  const q = await pool.query(
    `SELECT * FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1`,
    [pub_id]
  );
  return q.rows[0] || null;
}

/* ----------------------------------------------
   Auto-debug: extract missing key from operator error
---------------------------------------------- */
function detectMissingKey(operatorError) {
  if (!operatorError) return null;

  const text = JSON.stringify(operatorError).toLowerCase();

  const patterns = ["missing", "required", "not found"];

  for (let p of patterns) {
    if (text.includes(p)) {
      // extract KEY from `"cid is missing"` or `"missing cid"`
      const match = text.match(/"([a-z0-9_]+)"/i);
      if (match) return match[1];
    }
  }

  return null;
}

/* ----------------------------------------------
   Build Params (NEW SYSTEM)
---------------------------------------------- */
function buildParams(mapping, publisherData, hardcoded = {}, carryOver = {}) {
  let final = {};

  // --- 1. Add mapping values ---
  for (const operatorKey in mapping) {
    const publisherKey = mapping[operatorKey];

    if (publisherData[publisherKey] !== undefined) {
      final[operatorKey] = publisherData[publisherKey];
    }
  }

  // --- 2. Add hardcoded (fixed) values ---
  for (const key in hardcoded) {
    final[key] = hardcoded[key];

    // Auto-lowercase fallback
    final[key.toLowerCase()] = hardcoded[key];
  }

  // --- 3. Add carryOver (session keys, trx IDs) ---
  for (const key in carryOver) {
    final[key] = carryOver[key];

    // lower/upper versions
    final[key.toLowerCase()] = carryOver[key];
  }

  return final;
}

/* ----------------------------------------------
   SEND PIN
---------------------------------------------- */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    if (!publisher.operator_pin_send_url)
      return res.json({ success: false, message: "Operator SENDPIN URL missing" });

    const template = publisher.operator_parameters || {};

    const mapping = template.sendpin || {};
    const fixed = template.fixed || {};
    const publisherData = { ...req.query };

    const finalParams = buildParams(mapping, publisherData, fixed, {});

    let operatorResponse;
    try {
      operatorResponse = await axios.post(
        publisher.operator_pin_send_url,
        finalParams,
        { timeout: 8000 }
      );
    } catch (err) {
      operatorResponse = err.response ? err.response.data : err.message;
    }

    // detect missing key
    const missingKey = detectMissingKey(operatorResponse);

    if (missingKey && fixed[missingKey] !== undefined) {
      // auto fix: add this key
      finalParams[missingKey] = fixed[missingKey];
      finalParams[missingKey.toLowerCase()] = fixed[missingKey];

      // retry operator call
      operatorResponse = await axios.post(
        publisher.operator_pin_send_url,
        finalParams,
        { timeout: 8000 }
      );
    }

    // store for later verification step
    if (click_id) sendPinMemory[click_id] = operatorResponse.data || {};

    return res.json({
      success: true,
      operator_url_called: publisher.operator_pin_send_url,
      operator_params_sent: finalParams,
      operator_response: operatorResponse.data || operatorResponse
    });

  } catch (err) {
    console.error("SENDPIN ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

/* ----------------------------------------------
   VERIFY PIN
---------------------------------------------- */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    if (!publisher.operator_pin_verify_url)
      return res.json({ success: false, message: "Operator VERIFYPIN URL missing" });

    const template = publisher.operator_parameters || {};

    const mapping = template.verifypin || {};
    const fixed = template.fixed || {};
    const carryOver = sendPinMemory[click_id] || {};
    const publisherData = { ...req.query };

    const finalParams = buildParams(mapping, publisherData, fixed, carryOver);

    let operatorResponse;
    try {
      operatorResponse = await axios.post(
        publisher.operator_pin_verify_url,
        finalParams,
        { timeout: 8000 }
      );
    } catch (err) {
      operatorResponse = err.response ? err.response.data : err.message;
    }

    // detect missing key
    const missingKey = detectMissingKey(operatorResponse);

    if (missingKey && fixed[missingKey] !== undefined) {
      // Auto-fix again
      finalParams[missingKey] = fixed[missingKey];
      finalParams[missingKey.toLowerCase()] = fixed[missingKey];

      operatorResponse = await axios.post(
        publisher.operator_pin_verify_url,
        finalParams,
        { timeout: 8000 }
      );
    }

    return res.json({
      success: true,
      operator_url_called: publisher.operator_pin_verify_url,
      operator_params_sent: finalParams,
      operator_response: operatorResponse.data || operatorResponse
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

export default router;
