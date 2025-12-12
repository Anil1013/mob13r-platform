// routes/inapp.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

// Memory store → carry operator response from sendpin → verifypin
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
   Helper: Build Params From Template
--------------------------------------------------------- */
function buildParams(mapping, publisherData, fixed = {}, carry = {}) {
  const final = {};

  // Template → map publisher input fields
  for (const operatorKey in mapping) {
    const sourceKey = mapping[operatorKey];

    if (publisherData[sourceKey] !== undefined) {
      final[operatorKey] = publisherData[sourceKey];
    }

    // From carryover (operator response)
    if (carry[sourceKey] !== undefined) {
      final[operatorKey] = carry[sourceKey];
    }
  }

  // Add fixed values (cid etc)
  Object.assign(final, fixed);

  return final;
}

/* --------------------------------------------------------
   Helper: Convert JSON → Query String
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

/* ========================================================
                      SEND PIN
======================================================== */
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
      return res.json({ success: false, message: "Operator SENDPIN URL missing" });

    const publisherData = { ...req.query };
    const finalParams = buildParams(mapping, publisherData, fixed, {});

    let operatorResp;

    const qs = toQueryString(finalParams);
    const fullUrl = `${operatorUrl}?${qs}`;

    // Always GET because operator uses GET
    operatorResp = await axios.get(fullUrl, { timeout: 8000 });

    console.log("📡 SENDPIN =>", fullUrl);
    console.log("📥 SENDPIN RESPONSE:", operatorResp.data);

    // Store full operator response (Option B)
    if (click_id) {
      sendPinMemory[click_id] = operatorResp.data;
    }

    return res.json({
      success: true,
      mode,
      operator_url_called: fullUrl,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data
    });

  } catch (err) {
    console.error("SENDPIN ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

/* ========================================================
                      VERIFY PIN
======================================================== */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, click_id } = req.query;
    const publisher = await loadPublisher(pub_id);

    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    const template = publisher.operator_parameters || {};
    const mapping = template.verifypin || {};
    const fixed = template.fixed || {};

    const operatorUrl = publisher.operator_pin_verify_url;
    if (!operatorUrl)
      return res.json({ success: false, message: "Operator VERIFYPIN URL missing" });

    const carry = sendPinMemory[click_id] || {}; // Entire operator response

    const publisherData = { ...req.query };

    // Auto-merge operator response values
    const finalParams = buildParams(mapping, publisherData, fixed, carry);

    const qs = toQueryString(finalParams);
    const fullUrl = `${operatorUrl}?${qs}`;

    console.log("📡 VERIFYPIN =>", fullUrl);
    console.log("📤 CARRYOVER FROM SENDPIN:", carry);

    const operatorResp = await axios.get(fullUrl, { timeout: 8000 });

    return res.json({
      success: true,
      operator_url_called: fullUrl,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

export default router;
