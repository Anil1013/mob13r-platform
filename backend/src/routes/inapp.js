// routes/inappRoutes.js
import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* ======================================================
   HELPER: Load publisher tracking row by pub_id (pub_code)
====================================================== */
async function getTracking(pub_id) {
  const q = await pool.query("SELECT * FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1", [pub_id]);
  return q.rows.length ? q.rows[0] : null;
}

/* ======================================================
   HELPER: Build final operator URL
   - operatorUrl: operator endpoint string (may already include query)
   - operatorParameterMap: JSON mapping operatorParam -> publisherParam (e.g. { "cid":"click_id" })
   - reqQuery: incoming req.query (publisher-sent keys and values)
   - replacements: also replace angle-bracket placeholders like <msisdn>
====================================================== */
function buildFinalOperatorUrl(operatorUrl, operatorParameterMap = {}, reqQuery = {}) {
  // If operatorParamMap present, create a map of operatorParam -> value
  const opParams = {};

  if (operatorParameterMap && typeof operatorParameterMap === "object") {
    for (const [opKey, pubKey] of Object.entries(operatorParameterMap)) {
      // pubKey can be e.g. "click_id" or "<click_id>" -- normalize
      const cleanPubKey = String(pubKey).replace(/^<|>$/g, "");
      if (reqQuery[cleanPubKey] !== undefined) {
        opParams[opKey] = reqQuery[cleanPubKey];
      } else if (reqQuery[opKey] !== undefined) {
        // fallback: publisher might already send operator param name
        opParams[opKey] = reqQuery[opKey];
      }
    }
  }

  // Also copy common fields if present: msisdn, ip, ua, pin/otp, click_id
  const passthrough = ["msisdn", "ip", "ua", "pin", "otp", "click_id", "sessionKey", "clickid", "cid"];
  for (const k of passthrough) {
    if (reqQuery[k] !== undefined) opParams[k] = reqQuery[k];
  }

  // First, replace placeholders in the operatorUrl (supports <param> and {param})
  let urlStr = String(operatorUrl || "");
  for (const [k, v] of Object.entries(opParams)) {
    if (v === undefined || v === null) continue;
    const enc = encodeURIComponent(String(v));
    urlStr = urlStr.split(`<${k}>`).join(enc);
    urlStr = urlStr.split(`{${k}}`).join(enc);
  }

  // Now build final URL object and append any remaining opParams as query params
  let final;
  try {
    final = new URL(urlStr);
  } catch (e) {
    // If operatorUrl has no host (unlikely) or contains templated query without host, try prefixing a dummy origin
    // but prefer to return raw string as fallback
    try {
      final = new URL(urlStr, "https://dummy");
    } catch (err) {
      return urlStr; // best-effort
    }
  }

  // Add/overwrite query params with opParams (only those not already present)
  for (const [k, v] of Object.entries(opParams)) {
    if (v === undefined || v === null) continue;
    // If the operator URL already included the param via replacement, this will still set it — ok.
    final.searchParams.set(k, String(v));
  }

  // Preserve original query params from operatorUrl (they are in final.searchParams already)
  // If final was built using dummy origin, remove it for return
  const finalStr = final.toString();
  return final.origin === "https://dummy" ? finalStr.replace("https://dummy", "") : finalStr;
}

/* ======================================================
   Generic caller: GET operator endpoint
   Returns operator response or friendly json on error
====================================================== */
async function callOperatorUrl(operatorUrl) {
  try {
    const opRes = await axios.get(operatorUrl, { timeout: 15000 });
    return { success: true, operator_response: opRes.data };
  } catch (err) {
    return { success: false, error: err.message, operator_response: err.response?.data ?? null };
  }
}

/* ======================================================
   SENDPIN
   Example incoming:
   /inapp/sendpin?pub_id=PUB05&msisdn=9647...&ip=1.2.3.4&ua=...&click_id=3443
====================================================== */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id } = req.query;
    const track = await getTracking(pub_id);
    if (!track) return res.json({ success: false, message: "pub_id not found" });

    // Operator URL (from publisher_tracking_links.operator_pin_send_url OR pin_send_url if operator missing)
    const operatorUrl = track.operator_pin_send_url || track.pin_send_url;
    if (!operatorUrl) return res.json({ success: false, message: "Operator SENDPIN URL missing" });

    // operator_parameters stored as json mapping operatorParam -> publisherParam
    let opParamMap = {};
    try { opParamMap = track.operator_parameters ? (typeof track.operator_parameters === "string" ? JSON.parse(track.operator_parameters) : track.operator_parameters) : {}; } catch (e) { opParamMap = {}; }

    const finalUrl = buildFinalOperatorUrl(operatorUrl, opParamMap, req.query);

    console.log("📤 SENDPIN ->", finalUrl);
    const result = await callOperatorUrl(finalUrl);

    // Return helpful wrapper: operator_url_called + operator_response
    if (result.success) return res.json({ success: true, operator_url_called: finalUrl, operator_response: result.operator_response });
    return res.json({ success: false, operator_url_called: finalUrl, error: result.error, operator_response: result.operator_response });
  } catch (err) {
    console.error("SENDPIN ERROR:", err);
    return res.json({ success: false, message: "OTP not sent", error: err.message });
  }
});

/* ======================================================
   VERIFYPIN
   Example incoming:
   /inapp/verifypin?pub_id=PUB05&msisdn=...&pin=1234&ip=...&ua=...&click_id=...
====================================================== */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id } = req.query;
    const track = await getTracking(pub_id);
    if (!track) return res.json({ success: false, message: "pub_id not found" });

    const operatorUrl = track.operator_pin_verify_url || track.pin_verify_url;
    if (!operatorUrl) return res.json({ success: false, message: "Operator VERIFYPIN URL missing" });

    let opParamMap = {};
    try { opParamMap = track.operator_parameters ? (typeof track.operator_parameters === "string" ? JSON.parse(track.operator_parameters) : track.operator_parameters) : {}; } catch (e) { opParamMap = {}; }

    const finalUrl = buildFinalOperatorUrl(operatorUrl, opParamMap, req.query);

    console.log("📤 VERIFYPIN ->", finalUrl);
    const result = await callOperatorUrl(finalUrl);

    if (result.success) return res.json({ success: true, operator_url_called: finalUrl, operator_response: result.operator_response });
    return res.json({ success: false, operator_url_called: finalUrl, error: result.error, operator_response: result.operator_response });
  } catch (err) {
    console.error("VERIFYPIN ERROR:", err);
    return res.json({ success: false, error: err.message });
  }
});

/* ======================================================
   CHECK STATUS
   Example incoming:
   /inapp/checkstatus?pub_id=PUB05&msisdn=...
====================================================== */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id } = req.query;
    const track = await getTracking(pub_id);
    if (!track) return res.json({ success: false, message: "pub_id not found" });

    const operatorUrl = track.operator_status_url || track.check_status_url;
    if (!operatorUrl) return res.json({ success: false, message: "Operator STATUS URL missing" });

    let opParamMap = {};
    try { opParamMap = track.operator_parameters ? (typeof track.operator_parameters === "string" ? JSON.parse(track.operator_parameters) : track.operator_parameters) : {}; } catch (e) { opParamMap = {}; }

    const finalUrl = buildFinalOperatorUrl(operatorUrl, opParamMap, req.query);

    console.log("📤 CHECKSTATUS ->", finalUrl);
    const result = await callOperatorUrl(finalUrl);

    if (result.success) return res.json({ success: true, operator_url_called: finalUrl, operator_response: result.operator_response });
    return res.json({ success: false, operator_url_called: finalUrl, error: result.error, operator_response: result.operator_response });
  } catch (err) {
    console.error("CHECKSTATUS ERROR:", err);
    return res.json({ success: false, error: err.message });
  }
});

/* ======================================================
   PORTAL - redirect to operator portal (with mapped params)
   Example incoming:
   /inapp/portal?pub_id=PUB05&msisdn=...&click_id=...
====================================================== */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id } = req.query;
    const track = await getTracking(pub_id);
    if (!track) return res.json({ success: false, message: "pub_id not found" });

    const operatorUrl = track.operator_portal_url || track.portal_url;
    if (!operatorUrl) return res.json({ success: false, message: "Operator PORTAL URL missing" });

    let opParamMap = {};
    try { opParamMap = track.operator_parameters ? (typeof track.operator_parameters === "string" ? JSON.parse(track.operator_parameters) : track.operator_parameters) : {}; } catch (e) { opParamMap = {}; }

    const finalUrl = buildFinalOperatorUrl(operatorUrl, opParamMap, req.query);

    console.log("📤 PORTAL REDIRECT ->", finalUrl);
    // Redirect publisher to operator portal
    return res.redirect(finalUrl);
  } catch (err) {
    console.error("PORTAL ERROR:", err);
    return res.status(500).send("Portal redirect failed: " + err.message);
  }
});

export default router;
