// routes/inapp.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

// Memory store: sendpin → verifypin carry-over storage
const sendPinMemory = {}; // key = click_id

/* --------------------------------------------------------
   SAFE JSON PARSER
--------------------------------------------------------- */
function safeJsonParse(input) {
  if (!input) return {};
  if (typeof input === "object") return input;
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

/* --------------------------------------------------------
   Load publisher tracking row
--------------------------------------------------------- */
async function loadPublisher(pub_id) {
  const q = await pool.query(
    `SELECT *
     FROM publisher_tracking_links
     WHERE pub_code=$1
     LIMIT 1`,
    [pub_id]
  );
  const row = q.rows[0];
  if (!row) return null;

  // Parse JSON fields safely
  row.operator_parameters = safeJsonParse(row.operator_parameters);
  return row;
}

/* --------------------------------------------------------
   Build operator parameter payload
--------------------------------------------------------- */
function buildParams(mapping = {}, publisherData = {}, fixed = {}, carry = {}) {
  const final = {};

  // Map parameters: example → { cid: "click_id" }
  for (const operatorKey in mapping) {
    const pubKey = mapping[operatorKey];
    if (publisherData[pubKey]) {
      final[operatorKey] = publisherData[pubKey];
    }
  }

  // Add fixed values
  Object.assign(final, fixed);

  // Add carry-over (session, trx_id, etc.)
  Object.assign(final, carry);

  return final;
}

/* --------------------------------------------------------
   Convert params to GET query string
--------------------------------------------------------- */
function toQueryString(params = {}) {
  const q = new URLSearchParams();
  for (const key in params) {
    const val = params[key];
    if (val !== undefined && val !== null) q.append(key, val);
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

    const operatorUrl = publisher.operator_pin_send_url;
    if (!operatorUrl)
      return res.json({ success: false, message: "Operator SendPin URL missing" });

    const template = publisher.operator_parameters;

    const mode = template.mode?.toUpperCase() || "POST";
    const mapping = template.sendpin || {};
    const fixed = template.fixed || {};

    const publisherData = { ...req.query };

    const finalParams = buildParams(mapping, publisherData, fixed, {});

    let operatorResp;
    let fullUrl = operatorUrl;

    if (mode === "GET") {
      const qs = toQueryString(finalParams);
      fullUrl = `${operatorUrl}?${qs}`;
      console.log("📡 SENDPIN GET =>", fullUrl);

      operatorResp = await axios.get(fullUrl, { timeout: 8000 });
    } else {
      console.log("📡 SENDPIN POST =>", operatorUrl, finalParams);
      operatorResp = await axios.post(operatorUrl, finalParams, { timeout: 8000 });
    }

    // store for verifypin
    if (click_id) sendPinMemory[click_id] = operatorResp.data || {};

    return res.json({
      success: true,
      mode,
      operator_url_called: fullUrl,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data
    });

  } catch (err) {
    console.error("SENDPIN ERROR:", err.message);
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

    const operatorUrl = publisher.operator_pin_verify_url;
    if (!operatorUrl)
      return res.json({ success: false, message: "Operator VerifyPin URL missing" });

    const template = publisher.operator_parameters;

    const mode = template.mode?.toUpperCase() || "POST";
    const mapping = template.verifypin || {};
    const fixed = template.fixed || {};

    const publisherData = { ...req.query };

    // carry-over from sendpin
    const carry = sendPinMemory[click_id] || {};

    const finalParams = buildParams(mapping, publisherData, fixed, carry);

    let operatorResp;
    let fullUrl = operatorUrl;

    if (mode === "GET") {
      const qs = toQueryString(finalParams);
      fullUrl = `${operatorUrl}?${qs}`;

      console.log("📡 VERIFYPIN GET =>", fullUrl);

      operatorResp = await axios.get(fullUrl, { timeout: 8000 });
    } else {
      console.log("📡 VERIFYPIN POST =>", operatorUrl, finalParams);

      operatorResp = await axios.post(operatorUrl, finalParams, { timeout: 8000 });
    }

    return res.json({
      success: true,
      mode,
      operator_url_called: fullUrl,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err.message);
    return res.json({ success: false, message: err.message });
  }
});

/* --------------------------------------------------------
   STATUS CHECK (simple GET)
--------------------------------------------------------- */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    const url = publisher.operator_status_url;
    if (!url)
      return res.json({ success: false, message: "Operator Status URL missing" });

    const finalUrl = `${url}?msisdn=${msisdn}`;
    console.log("🔎 CHECKSTATUS =>", finalUrl);

    const r = await axios.get(finalUrl, { timeout: 8000 });

    return res.json({
      success: true,
      operator_url_called: finalUrl,
      operator_response: r.data
    });
  } catch (err) {
    console.error("STATUS ERROR:", err.message);
    return res.json({ success: false, message: err.message });
  }
});

/* --------------------------------------------------------
   PORTAL REDIRECT
--------------------------------------------------------- */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id, msisdn, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher)
      return res.json({ success: false, message: "Publisher not found" });

    const url = publisher.operator_portal_url;
    if (!url)
      return res.json({ success: false, message: "Operator Portal URL missing" });

    const redirectUrl = `${url}?msisdn=${msisdn}&click_id=${click_id}`;

    console.log("➡️ PORTAL REDIRECT =>", redirectUrl);

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("PORTAL ERROR:", err.message);
    return res.json({ success: false, message: err.message });
  }
});

export default router;
