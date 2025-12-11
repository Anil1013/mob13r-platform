// File: routes/inappRoutes.js
import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* ======================================================
   HELPER: Fetch publisher_tracking_links row by pub_id
   We expect that operator_* fields and operator_parameters were saved during creation
====================================================== */
async function getTrackingRow(pub_id) {
  const q = await pool.query(
    `SELECT *
     FROM publisher_tracking_links
     WHERE pub_code = $1
     LIMIT 1`,
    [pub_id]
  );
  return q.rows.length ? q.rows[0] : null;
}

/* ======================================================
   Helper: Build final operator URL from a base operator URL
   - Supports two styles:
     1) operator URL is a URL with query params, e.g. https://op/some?msisdn=<msisdn>&cid=<click_id>
        => try replacing <...> placeholders (encoded)
     2) operator URL is base endpoint without query string, and mapping provides parameter names
        => we will append mapped params as querystring
   - operatorParamsMap: JSON mapping { "operatorParamName": "publisherParamName", ... }
   - reqParams: object obtained from req.query (publisher-supplied names like msisdn, ip, ua, click_id, pin, etc)
====================================================== */
function buildOperatorUrl(rawOperatorUrl, operatorParamsMap = {}, reqParams = {}) {
  if (!rawOperatorUrl) return null;

  // 1) Replace angle-bracket placeholders if present (<msisdn>)
  let url = rawOperatorUrl;
  // replace all <param> patterns with encoded values if we find mapping or same name in reqParams
  url = url.replace(/<([a-zA-Z0-9_]+)>/g, (match, p1) => {
    // p1 is placeholder token inside <...>
    // First try: if operatorParamsMap has an entry where operatorParam === p1, use publisher param name
    // But operatorParamsMap maps operatorParam -> publisherParam, so check if mapping has operatorParam = p1
    const mappedPublisherParam = operatorParamsMap && operatorParamsMap[p1];
    const val = mappedPublisherParam ? reqParams[mappedPublisherParam] : reqParams[p1];
    return val !== undefined && val !== null ? encodeURIComponent(String(val)) : match; // if missing, leave placeholder
  });

  // 2) Now ensure final URL has query params for any mapping that wasn't placed into placeholders.
  try {
    const finalUrl = new URL(url);
    // For each operatorParamName in operatorParamsMap, if not present in finalUrl search params, set it from reqParams
    if (operatorParamsMap && typeof operatorParamsMap === "object") {
      Object.entries(operatorParamsMap).forEach(([operatorParam, publisherParam]) => {
        // skip if operatorParam already set in query string
        if (!finalUrl.searchParams.has(operatorParam)) {
          const val = reqParams[publisherParam];
          if (val !== undefined && val !== null) {
            finalUrl.searchParams.set(operatorParam, String(val));
          }
        }
      });
    }

    // Also include raw publisher params that the operator might accept unchanged (if operator did not specify mapping)
    // Example: operator accepts "msisdn" or "ip" directly
    Object.entries(reqParams).forEach(([k, v]) => {
      // only set if not already present
      if (!finalUrl.searchParams.has(k) && v !== undefined && v !== null) {
        finalUrl.searchParams.set(k, String(v));
      }
    });

    return finalUrl.toString();
  } catch (e) {
    // If URL constructor fails (maybe because rawOperatorUrl is not absolute), try fallback concatenation
    // Build query string manually
    const qs = new URLSearchParams();
    if (operatorParamsMap && typeof operatorParamsMap === "object") {
      Object.entries(operatorParamsMap).forEach(([operatorParam, publisherParam]) => {
        const val = reqParams[publisherParam];
        if (val !== undefined && val !== null) qs.set(operatorParam, String(val));
      });
    }
    // include direct params too
    Object.entries(reqParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && !qs.has(k)) qs.set(k, String(v));
    });

    // if rawOperatorUrl already has "?" append; otherwise attach "?"
    if (rawOperatorUrl.includes("?")) {
      return rawOperatorUrl + "&" + qs.toString();
    }
    return rawOperatorUrl + "?" + qs.toString();
  }
}

/* ======================================================
   SENDPIN
   - publisher calls: /inapp/sendpin?pub_id=PUB05&msisdn=...&ip=...&ua=...&click_id=...
====================================================== */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.json({ success: false, message: "pub_id required" });

    const track = await getTrackingRow(pub_id);
    if (!track) return res.json({ success: false, message: "tracking row not found" });

    // operator url and operator parameter mapping saved in DB
    // prefer operator_pin_send_url saved in publisher_tracking_links
    const operatorRaw = track.operator_pin_send_url || track.operator_send_url || null;
    const operatorParamsMap = track.operator_parameters ? JSON.parse(track.operator_parameters) : null;

    if (!operatorRaw) {
      return res.json({ success: false, message: "Operator SENDPIN URL missing" });
    }

    // reqParams are publisher-level params (msisdn, ip, ua, click_id, pin)
    const reqParams = {
      msisdn: req.query.msisdn,
      ip: req.query.ip ?? req.query.user_ip ?? req.ip,
      ua: req.query.ua ?? req.query.user_agent ?? req.get?.("User-Agent"),
      click_id: req.query.click_id,
      pin: req.query.pin, // not used for sendpin but included
      pub_id
    };

    // Build final operator url using operator parameter mapping
    const finalUrl = buildOperatorUrl(operatorRaw, operatorParamsMap, reqParams);

    console.log("📤 SENDPIN -> final operator URL:", finalUrl);

    const opRes = await axios.get(finalUrl, { timeout: 15000 });
    return res.json({
      success: true,
      operator_url_called: finalUrl,
      operator_response: opRes.data
    });
  } catch (err) {
    console.error("SENDPIN ERROR:", err.message || err);
    return res.json({ success: false, message: "OTP not sent", error: err.message || String(err) });
  }
});

/* ======================================================
   VERIFYPIN
   - publisher calls: /inapp/verifypin?pub_id=PUB05&msisdn=...&pin=1234&ip=...&ua=...&click_id=...
====================================================== */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.json({ success: false, message: "pub_id required" });
    if (!req.query.pin && !req.query.otp) return res.json({ success: false, message: "pin (otp) required" });

    const track = await getTrackingRow(pub_id);
    if (!track) return res.json({ success: false, message: "tracking row not found" });

    const operatorRaw = track.operator_pin_verify_url || track.operator_verify_url || null;
    const operatorParamsMap = track.operator_parameters ? JSON.parse(track.operator_parameters) : null;

    if (!operatorRaw) return res.json({ success: false, message: "Operator VERIFYPIN URL missing" });

    const reqParams = {
      msisdn: req.query.msisdn,
      ip: req.query.ip ?? req.query.user_ip ?? req.ip,
      ua: req.query.ua ?? req.query.user_agent ?? req.get?.("User-Agent"),
      click_id: req.query.click_id,
      pin: req.query.pin ?? req.query.otp,
      pub_id
    };

    // Note: some operator templates expect <otp> placeholder while mapping may map "otp_code": "pin"
    const finalUrl = buildOperatorUrl(operatorRaw, operatorParamsMap, reqParams);

    console.log("📤 VERIFYPIN -> final operator URL:", finalUrl);

    const opRes = await axios.get(finalUrl, { timeout: 15000 });
    return res.json({
      success: true,
      operator_url_called: finalUrl,
      operator_response: opRes.data
    });
  } catch (err) {
    console.error("VERIFYPIN ERROR:", err.message || err);
    return res.json({ success: false, message: "OTP verify failed", error: err.message || String(err) });
  }
});

/* ======================================================
   CHECK STATUS
   - publisher calls: /inapp/checkstatus?pub_id=PUB05&msisdn=...
====================================================== */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.json({ success: false, message: "pub_id required" });

    const track = await getTrackingRow(pub_id);
    if (!track) return res.json({ success: false, message: "tracking row not found" });

    const operatorRaw = track.operator_status_url || track.operator_check_status_url || null;
    const operatorParamsMap = track.operator_parameters ? JSON.parse(track.operator_parameters) : null;

    if (!operatorRaw) return res.json({ success: false, message: "Operator STATUS URL missing" });

    const reqParams = {
      msisdn: req.query.msisdn,
      pub_id
    };

    const finalUrl = buildOperatorUrl(operatorRaw, operatorParamsMap, reqParams);
    console.log("📤 CHECKSTATUS -> final operator URL:", finalUrl);

    const opRes = await axios.get(finalUrl, { timeout: 15000 });
    return res.json({
      success: true,
      operator_url_called: finalUrl,
      operator_response: opRes.data
    });
  } catch (err) {
    console.error("CHECKSTATUS ERROR:", err.message || err);
    return res.json({ success: false, message: "Status check failed", error: err.message || String(err) });
  }
});

/* ======================================================
   PORTAL REDIRECT
   - publisher calls: /inapp/portal?pub_id=PUB05&msisdn=...&click_id=...
   - we redirect publisher directly to operator portal with dynamic mapped params
====================================================== */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) return res.send("pub_id required");

    const track = await getTrackingRow(pub_id);
    if (!track) return res.send("tracking row not found");

    const operatorRaw = track.operator_portal_url || track.operator_portal || null;
    const operatorParamsMap = track.operator_parameters ? JSON.parse(track.operator_parameters) : null;

    if (!operatorRaw) return res.send("Operator PORTAL URL missing");

    const reqParams = {
      msisdn: req.query.msisdn,
      click_id: req.query.click_id,
      pub_id
    };

    const finalUrl = buildOperatorUrl(operatorRaw, operatorParamsMap, reqParams);
    console.log("📤 PORTAL REDIRECT ->", finalUrl);

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("PORTAL ERROR:", err.message || err);
    return res.send("Portal redirect failed: " + (err.message || String(err)));
  }
});

export default router;
