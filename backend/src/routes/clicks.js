import express from "express";
import fraudCheck from "../middleware/fraudCheck.js";
import pool from "../db.js";

const router = express.Router();

/**
 * PUBLIC CLICK ROUTE
 * Example:
 * /click?pub_id=PUB03&geo=BD&carrier=Robi&click_id=123
 */
router.get("/click", async (req, res, next) => {
  try {
    req.expected_geo = (req.query.geo || "").toUpperCase();
    req.expected_carrier = (req.query.carrier || "").toUpperCase();
    next();
  } catch (err) {
    console.log("Click pre-handler error", err);
    next();
  }
}, fraudCheck, async (req, res) => {
  try {
    // TRUE USER IP
    const ip =
      (req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        req.ip ||
        "")
        .split(",")[0]
        .trim();

    // INSERT → MAIN CLICK TABLE
    await pool.query(
      `INSERT INTO click_logs 
        (pub_id, ip, ua, geo, carrier, click_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [
        req.query.pub_id || null,
        ip,
        req.headers["user-agent"] || "",
        req.query.geo || null,
        req.query.carrier || null,
        req.query.click_id || null
      ]
    );

    // INSERT analytics_clicks ALSO (for dashboard analytics)
    await pool.query(
      `INSERT INTO analytics_clicks
        (pub_id, offer_id, geo, carrier, ip, ua, click_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [
        req.query.pub_id || null,
        null, // offer_id not coming from redirect (optional)
        req.query.geo || null,
        req.query.carrier || null,
        ip,
        req.headers["user-agent"] || "",
        req.query.click_id || null,
      ]
    );

  } catch (err) {
    console.log("Click logging error:", err);
  }

  return res.json({
    status: "ok",
    msg: "click stored",
    pub: req.query.pub_id,
    geo: req.query.geo,
    carrier: req.query.carrier,
    click_id: req.query.click_id,
  });
});

export default router;
