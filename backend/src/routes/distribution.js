// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/* ===========================================================
   SHARED CLICK LOG
=========================================================== */
async function logClick(req, pub_id, offer_id, geo, carrier) {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    await pool.query(
      `
      INSERT INTO analytics_clicks
      (pub_id, offer_id, geo, carrier, ip, ua, referer, params)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        pub_id,
        offer_id,
        geo,
        carrier,
        ip,
        req.headers["user-agent"] || null,
        req.headers["referer"] || null,
        JSON.stringify(req.query || {}),
      ]
    );
  } catch (err) {
    console.error("CLICK LOG ERROR:", err);
  }
}

/* ===========================================================
   OFFER CAP COUNTS
=========================================================== */
async function getOfferUsage(pub_id, offerIds = []) {
  if (!offerIds.leng
