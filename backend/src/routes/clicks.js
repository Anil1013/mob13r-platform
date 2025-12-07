// backend/src/routes/click.js
import express from "express";
import fraudCheck from "../middleware/fraudCheck.js";
import pool from "../db.js";

const router = express.Router();

/**
 * FINAL CLICK ROUTE
 * This receives traffic after distribution redirection:
 * /api/clicks/click?pub_id=PUB03&geo=BD&carrier=Robi&click_id=123
 */
router.get("/click", 
  // 1) Set expected GEO/CARRIER for fraudCheck
  (req, res, next) => {
    req.expected_geo = (req.query.geo || "").toUpperCase();
    req.expected_carrier = (req.query.carrier || "").toUpperCase();
    next();
  },

  // 2) Fraud Check
  fraudCheck,

  // 3) MAIN CLICK HANDLER
  async (req, res) => {
    try {
      const pub = req.query.pub_id || null;
      const geo = req.query.geo || null;
      const carrier = req.query.carrier || null;
      const ip = req.ip;
      const ua = req.headers["user-agent"] || "";
      const clickId = req.query.click_id || null;

      // -----------------------
      // INSERT INTO clicks_log
      // -----------------------
      await pool.query(
        `INSERT INTO clicks_log 
        (pub_id, ip, ua, geo, carrier, click_id, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [pub, ip, ua, geo, carrier, clickId]
      );

      // -----------------------
      // INSERT INTO analytics_clicks
      // (your table name as per analyticsClicks.js)
      // -----------------------
      await pool.query(
        `INSERT INTO analytics_clicks
        (pub_id, offer_id, geo, carrier, ip, ua, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [
          pub,
          null,        // offer_id not available from click link
          geo,
          carrier,
          ip,
          ua
        ]
      );

      // -----------------------
      // SUCCESS RESPONSE
      // -----------------------
      return res.json({
        status: "ok",
        message: "click logged",
        pub,
        geo,
        carrier,
        click_id: clickId
      });

    } catch (err) {
      console.log("CLICK INSERT ERROR:", err);
      return res.status(500).json({ error: "internal_error" });
    }
  }
);

export default router;
