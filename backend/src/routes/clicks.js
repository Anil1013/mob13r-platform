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

    // ------------------------------------
    // 1️⃣ FIND PUBLISHER (auto mapping)
    // ------------------------------------
    let publisher_id = null;
    let publisher_name = null;

    try {
      const r1 = await pool.query(
        `SELECT id, name 
         FROM publishers 
         WHERE pub_code=$1 LIMIT 1`,
        [pub]
      );
      if (r1.rows.length) {
        publisher_id = r1.rows[0].id;
        publisher_name = r1.rows[0].name;
      }
    } catch (err) {
      console.log("publisher lookup error:", err);
    }

    // ------------------------------------
    // 2️⃣ FIND OFFER (via tracking link)
    // ------------------------------------
    let offer_id = null;
    let offer_code = null;
    let offer_name = null;
    let advertiser_name = null;

    try {
      const r2 = await pool.query(
        `SELECT 
            o.id, o.offer_id AS code, o.name, o.advertiser_name
         FROM publisher_tracking_links ptl
         LEFT JOIN offers o ON o.id = ptl.offer_id
         WHERE ptl.pub_code=$1
         LIMIT 1`,
        [pub]
      );

      if (r2.rows.length) {
        offer_id = r2.rows[0].id;
        offer_code = r2.rows[0].code;
        offer_name = r2.rows[0].name;
        advertiser_name = r2.rows[0].advertiser_name;
      }
    } catch (err) {
      console.log("offer lookup error:", err);
    }

    try {
      // ------------------------------------------------
      // 3️⃣ RAW CLICK LOG (simple log)
      // ------------------------------------------------
      await pool.query(
        `INSERT INTO click_logs 
        (publisher_id, pub_code, offer_id, offer_code, click_id, ip_address, user_agent, geo, carrier, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
        [
          publisher_id,
          pub,
          offer_id,
          offer_code,
          clickId,
          ip,
          ua,
          geo,
          carrier
        ]
      );

      // ------------------------------------------------
      // 4️⃣ ANALYTICS CLICK (dashboard)
      // ------------------------------------------------
      await pool.query(
        `INSERT INTO analytics_clicks 
        (pub_id, offer_id, geo, carrier, ip, ua, referer, params, created_at, click_id,
         fraud_flag, fraud_reason, fraud_risk)
         VALUES 
        ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,false,NULL,0)`,
        [
          pub,
          offer_id,
          geo,
          carrier,
          ip,
          ua,
          req.headers.referer || "",
          null,
          clickId
        ]
      );
    } catch (e) {
      console.log("Click insert error:", e);
    }

    return res.json({
      status: "ok",
      msg: "click stored",
      pub,
      publisher_name,
      offer_id,
      offer_name,
      advertiser_name,
      geo,
      carrier,
      click_id: clickId,
    });
  }
);

export default router;
