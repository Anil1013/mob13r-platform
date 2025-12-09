import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

/* ----------------------------------------
   Helper Functions
---------------------------------------- */
function generateSessionKey() {
  return "SK_" + Math.random().toString(36).substring(2, 12);
}

function getClientIP(req) {
  return (
    (req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "").toString().split(",")[0]
  );
}

/* ----------------------------------------
   Log to Database
---------------------------------------- */
async function logInapp(data) {
  const query = `
    INSERT INTO inapp_logs 
    (type, pub_id, msisdn, pin, ip, ua, session_key, sub_pub_id,
     operator_url, operator_response, success, error)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  `;

  await pool.query(query, [
    data.type,
    data.pub_id,
    data.msisdn || null,
    data.pin || null,
    data.ip || null,
    data.ua || null,
    data.sessionKey || null,
    data.sub_pub_id || null,
    data.operator_url || null,
    data.operator_response || null,
    data.success,
    data.error || null,
  ]);
}

/* ----------------------------------------
   SEND PIN
---------------------------------------- */
router.get("/sendpin", async (req, res) => {
  const { pub_id, msisdn, ua } = req.query;
  let { ip, sessionKey, sub_pub_id } = req.query;

  sessionKey = sessionKey || generateSessionKey();
  sub_pub_id = sub_pub_id || "0";
  ip = ip || getClientIP(req);

  try {
    if (!pub_id || !msisdn) {
      return res.json({ success: false, message: "Missing pub_id or msisdn" });
    }

    const dbRes = await pool.query(
      `SELECT pin_send_url FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1`,
      [pub_id]
    );

    if (!dbRes.rowCount) {
      return res.json({ success: false, message: "No template found" });
    }

    const url = new URL(dbRes.rows[0].pin_send_url);
    url.searchParams.set("pub_id", pub_id);
    url.searchParams.set("msisdn", msisdn);
    url.searchParams.set("ip", ip);
    url.searchParams.set("ua", ua || "");
    url.searchParams.set("sessionKey", sessionKey);
    url.searchParams.set("sub_pub_id", sub_pub_id);

    const operator = await axios.get(url.toString(), {
      timeout: 15000,
      validateStatus: () => true,
    });

    // Log success
    await logInapp({
      type: "sendpin",
      pub_id,
      msisdn,
      ua,
      ip,
      sessionKey,
      sub_pub_id,
      operator_url: url.toString(),
      operator_response: operator.data,
      success: true,
    });

    return res.json({
      success: true,
      request_url: url.toString(),
      operator_response: operator.data,
    });
  } catch (err) {
    // Log failure
    await logInapp({
      type: "sendpin",
      pub_id,
      msisdn,
      ua,
      ip,
      sessionKey,
      sub_pub_id,
      operator_url: null,
      operator_response: null,
      success: false,
      error: err.message,
    });

    return res.json({
      success: false,
      message: "OTP not sent",
      error: err.message,
    });
  }
});

/* ----------------------------------------
   VERIFY PIN
---------------------------------------- */
router.get("/verifypin", async (req, res) => {
  const { pub_id, msisdn, pin, ua } = req.query;
  let { ip, sessionKey, sub_pub_id } = req.query;

  sessionKey = sessionKey || generateSessionKey();
  sub_pub_id = sub_pub_id || "0";
  ip = ip || getClientIP(req);

  try {
    if (!pub_id || !msisdn || !pin) {
      return res.json({ success: false, message: "Missing inputs" });
    }

    const dbRes = await pool.query(
      `SELECT pin_verify_url FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1`,
      [pub_id]
    );

    const url = new URL(dbRes.rows[0].pin_verify_url);
    url.searchParams.set("pub_id", pub_id);
    url.searchParams.set("msisdn", msisdn);
    url.searchParams.set("pin", pin);
    url.searchParams.set("ip", ip);
    url.searchParams.set("ua", ua || "");
    url.searchParams.set("sessionKey", sessionKey);
    url.searchParams.set("sub_pub_id", sub_pub_id);

    const operator = await axios.get(url.toString(), {
      timeout: 15000,
      validateStatus: () => true,
    });

    // Log verify
    await logInapp({
      type: "verifypin",
      pub_id,
      msisdn,
      pin,
      ua,
      ip,
      sessionKey,
      sub_pub_id,
      operator_url: url.toString(),
      operator_response: operator.data,
      success: true,
    });

    return res.json({
      success: true,
      operator_response: operator.data,
    });
  } catch (err) {
    await logInapp({
      type: "verifypin",
      pub_id,
      msisdn,
      pin,
      ua,
      ip,
      sessionKey,
      sub_pub_id,
      operator_response: null,
      success: false,
      error: err.message,
    });

    return res.json({
      success: false,
      message: "Verification failed",
      error: err.message,
    });
  }
});

/* ----------------------------------------
   CHECK STATUS
---------------------------------------- */
router.get("/checkstatus", async (req, res) => {
  const { pub_id, msisdn } = req.query;
  let { ip, sessionKey, sub_pub_id } = req.query;

  sessionKey = sessionKey || generateSessionKey();
  sub_pub_id = sub_pub_id || "0";
  ip = ip || getClientIP(req);

  try {
    const dbRes = await pool.query(
      `SELECT check_status_url FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1`,
      [pub_id]
    );

    const url = new URL(dbRes.rows[0].check_status_url);
    url.searchParams.set("pub_id", pub_id);
    url.searchParams.set("msisdn", msisdn);
    url.searchParams.set("ip", ip);
    url.searchParams.set("sessionKey", sessionKey);
    url.searchParams.set("sub_pub_id", sub_pub_id);

    const operator = await axios.get(url.toString(), {
      timeout: 15000,
      validateStatus: () => true,
    });

    await logInapp({
      type: "checkstatus",
      pub_id,
      msisdn,
      ua: null,
      ip,
      sessionKey,
      sub_pub_id,
      operator_url: url.toString(),
      operator_response: operator.data,
      success: true,
    });

    return res.json({
      success: true,
      operator_response: operator.data,
    });
  } catch (err) {
    await logInapp({
      type: "checkstatus",
      pub_id,
      msisdn,
      ip,
      sessionKey,
      sub_pub_id,
      success: false,
      error: err.message,
    });

    return res.json({ success: false, error: err.message });
  }
});

/* ----------------------------------------
   PORTAL
---------------------------------------- */
router.get("/portal", async (req, res) => {
  const { pub_id } = req.query;

  try {
    const dbRes = await pool.query(
      `SELECT portal_url FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1`,
      [pub_id]
    );

    const url = new URL(dbRes.rows[0].portal_url);
    url.searchParams.set("pub_id", pub_id);

    await logInapp({
      type: "portal",
      pub_id,
      success: true,
      operator_url: url.toString(),
    });

    return res.redirect(url.toString());
  } catch (err) {
    await logInapp({
      type: "portal",
      pub_id,
      success: false,
      error: err.message,
    });

    return res.send("Portal redirect failed");
  }
});

export default router;
