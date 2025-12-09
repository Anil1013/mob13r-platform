import express from "express";
import pool from "../db.js";
import axios from "axios";

const router = express.Router();

/* =====================================================
   INAPP - SEND PIN
   ===================================================== */
router.get("/sendpin", async (req, res) => {
  try {
    const { pub_id, msisdn, user_ip, ua } = req.query;

    if (!pub_id || !msisdn) {
      return res.json({ success: false, message: "Missing pub_id or msisdn" });
    }

    // Find tracking link by PUB
    const linkRes = await pool.query(
      "SELECT pin_send_url FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
      [pub_id]
    );

    if (!linkRes.rows.length) {
      return res.json({ success: false, message: "Invalid pub_id" });
    }

    const operatorUrl = linkRes.rows[0].pin_send_url
      .replace("<msisdn>", msisdn)
      .replace("<ip>", user_ip || "")
      .replace("<ua>", ua || "");

    const response = await axios.get(operatorUrl);
    return res.json(response.data);

  } catch (err) {
    console.error("SENDPIN ERROR", err.message);
    return res.json({ success: false, message: "OTP not sent", error: err.message });
  }
});

/* =====================================================
   INAPP - VERIFY PIN
   ===================================================== */
router.get("/verifypin", async (req, res) => {
  try {
    const { pub_id, msisdn, pin, user_ip, ua } = req.query;

    if (!pub_id || !msisdn || !pin) {
      return res.json({ success: false, message: "Missing params" });
    }

    const linkRes = await pool.query(
      "SELECT pin_verify_url FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
      [pub_id]
    );

    if (!linkRes.rows.length) {
      return res.json({ success: false, message: "Invalid pub_id" });
    }

    const operatorUrl = linkRes.rows[0].pin_verify_url
      .replace("<msisdn>", msisdn)
      .replace("<otp>", pin)
      .replace("<ip>", user_ip || "")
      .replace("<ua>", ua || "");

    const response = await axios.get(operatorUrl);
    return res.json(response.data);
  } catch (err) {
    return res.json({ success: false, message: "OTP verification failed", error: err.message });
  }
});

/* =====================================================
   INAPP - CHECK STATUS
   ===================================================== */
router.get("/checkstatus", async (req, res) => {
  try {
    const { pub_id, msisdn } = req.query;

    const linkRes = await pool.query(
      "SELECT check_status_url FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
      [pub_id]
    );

    if (!linkRes.rows.length) {
      return res.json({ success: false, message: "Invalid pub_id" });
    }

    const operatorUrl = linkRes.rows[0].check_status_url.replace("<msisdn>", msisdn);

    const response = await axios.get(operatorUrl);
    return res.json(response.data);
  } catch (err) {
    return res.json({ success: false, message: "Status check failed" });
  }
});

/* =====================================================
   INAPP - PORTAL REDIRECT
   ===================================================== */
router.get("/portal", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const linkRes = await pool.query(
      "SELECT portal_url FROM publisher_tracking_links WHERE pub_code=$1 LIMIT 1",
      [pub_id]
    );

    if (!linkRes.rows.length) {
      return res.json({ success: false, message: "Invalid pub_id" });
    }

    const portalUrl = linkRes.rows[0].portal_url;
    return res.redirect(portalUrl);

  } catch (err) {
    return res.json({ success: false, message: "Portal error" });
  }
});

export default router;
