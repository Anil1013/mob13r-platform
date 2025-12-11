// routes/inappRoutes.js
import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

// Cache to store sendpin results so verifypin can use them
const sendPinMemory = {}; // key = click_id

/* --------------------------------------------------------
   Helper: Load Publisher Tracking + Template Parameters
--------------------------------------------------------- */
async function loadPublisher(pub_id) {
  const q = await pool.query(
    `SELECT *
     FROM publisher_tracking_links
     WHERE pub_code=$1 LIMIT 1`,
    [pub_id]
  );
  return q.rows[0] || null;
}

/* --------------------------------------------------------
   Helper: Build Final Params (new parameter system)
--------------------------------------------------------- */
function buildParams(mapping, publisherData, hardcoded = {}, carryOver = {}) {
  const final = {};

  // 1. Values from mapping (template)
  for (const operatorKey in mapping) {
    const publisherKey = mapping[operatorKey];

    if (publisherData[publisherKey]) {
      final[operatorKey] = publisherData[publisherKey];
    }
  }

  // 2. Add hardcoded template values
  Object.assign(final, hardcoded);

  // 3. Add carry-over from sendpin (session_key, trx_id etc)
  Object.assign(final, carryOver);

  return final;
}

/* --------------------------------------------------------
   SEND PIN
--------------------------------------------------------- */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, ip, ua, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher) {
      return res.json({ success: false, message: "Publisher not found" });
    }

    if (!publisher.operator_pin_send_url) {
      return res.json({ success: false, message: "Operator SENDPIN URL missing" });
    }

    const template = publisher.operator_parameters || {};

    const mapping = template.sendpin || {};            // mapping for sendpin
    const hardcoded = template.fixed || {};            // fixed template values (if any)
    const carryOver = {};                              // nothing yet for sendpin

    const publisherData = { ...req.query };

    // Build final operator parameter payload
    const finalParams = buildParams(mapping, publisherData, hardcoded, carryOver);

    // Call operator endpoint
    const operatorResp = await axios.post(
      publisher.operator_pin_send_url,
      finalParams,
      { timeout: 8000 }
    );

    // Store response for verifypin
    if (click_id) {
      sendPinMemory[click_id] = operatorResp.data || {};
    }

    return res.json({
      success: true,
      operator_url_called: publisher.operator_pin_send_url,
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
    const { pub_id, msisdn, pin, ip, ua, click_id } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher) {
      return res.json({ success: false, message: "Publisher not found" });
    }

    if (!publisher.operator_pin_verify_url) {
      return res.json({ success: false, message: "Operator VERIFYPIN URL missing" });
    }

    const template = publisher.operator_parameters || {};

    const mapping = template.verifypin || {};          // mapping for verify
    const hardcoded = template.fixed || {};            // fixed values
    const carryOver = sendPinMemory[click_id] || {};   // data from sendpin

    const publisherData = { ...req.query };

    // Build final operator parameter payload
    const finalParams = buildParams(mapping, publisherData, hardcoded, carryOver);

    // Call operator verify endpoint
    const operatorResp = await axios.post(
      publisher.operator_pin_verify_url,
      finalParams,
      { timeout: 8000 }
    );

    return res.json({
      success: true,
      operator_url_called: publisher.operator_pin_verify_url,
      operator_params_sent: finalParams,
      operator_response: operatorResp.data
    });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

/* --------------------------------------------------------
   CHECK STATUS
--------------------------------------------------------- */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    const publisher = await loadPublisher(pub_id);
    if (!publisher) {
      return res.json({ success: false, message: "Publisher not found" });
    }

    if (!publisher.operator_status_url) {
      return res.json({ success: false, message: "Operator STATUS URL missing" });
    }

    // Basic operator call (status usually only needs MSISDN)
    const operatorResp = await axios.get(
      `${publisher.operator_status_url}?msisdn=${msisdn}`,
      { timeout: 8000 }
    );

    return res.json({
      success: true,
      operator_url_called: publisher.operator_status_url,
      operator_response: operatorResp.data
    });
  } catch (err) {
    console.error("STATUS ERROR:", err);
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
    if (!publisher) {
      return res.json({ success: false, message: "Publisher not found" });
    }

    if (!publisher.operator_portal_url) {
      return res.json({ success: false, message: "Operator PORTAL URL missing" });
    }

    const redirectUrl =
      `${publisher.operator_portal_url}?msisdn=${msisdn}&click_id=${click_id}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("PORTAL ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

export default router;
