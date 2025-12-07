// backend/src/routes/click.js
import express from "express";
import fraudCheck from "../middleware/fraudCheck.js";
import pool from "../db.js";

const router = express.Router();

/**
 * CLICK ROUTE
 * Example:
 * /click?pub_id=PUB03&geo=BD&carrier=Robi&click_id=123
 */
router.get(
  "/click",
  (req, res, next) => {
    req.expected_geo = (req.query.geo || "").toUpperCase();
    req.expected_carrier = (req.query.carrier || "").toUpperCase();
    next();
  },
  fraudCheck,
  async (req, res) => {
    const pub = req.query.pub_id?.toUpperCase() || null;
    const clickId = req.query.click_id || null;
    const geo = req.query.geo || null;
    const carrier = req.query.carrier || null;

    const ip =
      (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
    const ua = req.headers["user-agent"] || "";

    try {
      // 1️⃣ RAW CLICK LOG
      await pool.query(
        `INSERT INTO click_logs (pub_code, ip_address, user_agent, geo, carrier, click_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [pub, ip, ua, geo, carrier, clickId]
      );

      // 2️⃣ ENRICHED ANALYTICS CLICK
      await pool.query(
        `INSERT INTO analytics_clicks (pub_id, ip, ua, geo, carrier, click_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [pub, ip, ua, geo, carrier, clickId]
      );
    } catch (e) {
      console.log("Click insert error:", e);
    }

    return res.json({
      status: "ok",
      msg: "click stored",
      pub,
      geo,
      carrier,
      click_id: clickId,
    });
  }
);

export default router;
