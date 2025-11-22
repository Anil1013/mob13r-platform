// backend/src/routes/click.js
import express from "express";
import fraudCheck from "../middleware/fraudCheck.js";
import pool from "../db.js";

const router = express.Router();

/**
 * CLICK ROUTE (with full fraud protection)
 * Example:
 * /click?pub_id=PUB03&geo=BD&carrier=Robi&click_id=123
 */
router.get("/click", (req, res, next) => {
  // Inject expected GEO & CARRIER for fraudCheck
  req.expected_geo = (req.query.geo || "").toUpperCase();
  req.expected_carrier = (req.query.carrier || "").toUpperCase();

  // Send forward to fraudCheck
  next();
}, fraudCheck, async (req, res) => {

  // Log click to DB (optional)
  try {
    await pool.query(
      `INSERT INTO clicks_log (pub_id, ip, ua, geo, carrier, click_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [
        req.query.pub_id || null,
        req.ip,
        req.headers["user-agent"],
        req.query.geo || null,
        req.query.carrier || null,
        req.query.click_id || null
      ]
    );
  } catch (err) {
    console.warn("click log error", err);
  }

  // Redirect to advertiser (mock)
  return res.json({
    status: "ok",
    msg: "click received",
    pub: req.query.pub_id,
    geo: req.query.geo,
    carrier: req.query.carrier,
    click_id: req.query.click_id
  });
});

export default router;
