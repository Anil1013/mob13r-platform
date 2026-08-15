import express from "express";
import crypto from "crypto";
import pool from "../db.js";

const router = express.Router();

function generateClickId() {
  return crypto.randomBytes(12).toString("hex"); // 24-char unique click id
}

function fillMacros(url, map) {
  let out = url;
  for (const [key, val] of Object.entries(map)) {
    out = out.split(`{${key}}`).join(encodeURIComponent(val ?? ""));
  }
  return out;
}

// PUBLIC: GET /click?cid=<tracking_slug>&aff_id=<affiliate_key>&sub1..sub5=
// This is the single URL pushed to the advertiser / used by the publisher/affiliate.
router.get("/click", async (req, res) => {
  try {
    const { cid, aff_id, sub1, sub2, sub3, sub4, sub5 } = req.query;
    if (!cid) return res.status(400).send("Missing cid");

    const campRes = await pool.query(`SELECT * FROM campaigns WHERE tracking_slug = $1`, [cid]);
    if (!campRes.rows.length) return res.status(404).send("Campaign not found");
    const campaign = campRes.rows[0];

    if (campaign.status !== "active") return res.status(410).send("Campaign is paused");

    // reset daily counter at IST midnight
    await pool.query(
      `UPDATE campaigns SET today_clicks = 0, today_conversions = 0,
         last_reset_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
       WHERE id = $1 AND last_reset_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
      [campaign.id]
    );

    if (campaign.daily_cap && campaign.today_clicks >= campaign.daily_cap) {
      return res.status(429).send("Daily cap reached");
    }

    let affiliateId = null;
    if (aff_id) {
      const affRes = await pool.query(
        `SELECT id FROM affiliates WHERE affiliate_key = $1 AND org_id = $2`,
        [aff_id, campaign.org_id]
      );
      if (affRes.rows.length) affiliateId = affRes.rows[0].id;
    }

    const clickId = generateClickId();
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    const userAgent = req.headers["user-agent"] || "";

    await pool.query(
      `INSERT INTO clicks (click_id, org_id, campaign_id, affiliate_id, sub1, sub2, sub3, sub4, sub5, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [clickId, campaign.org_id, campaign.id, affiliateId,
       sub1 || null, sub2 || null, sub3 || null, sub4 || null, sub5 || null, ip, userAgent]
    );

    await pool.query(`UPDATE campaigns SET today_clicks = today_clicks + 1 WHERE id = $1`, [campaign.id]);

    const destination = fillMacros(campaign.destination_url, {
      click_id: clickId,
      aff_id: aff_id || "",
      sub1: sub1 || "", sub2: sub2 || "", sub3: sub3 || "", sub4: sub4 || "", sub5: sub5 || "",
      payout: campaign.payout,
      geo: campaign.geo || "",
      ip,
    });

    return res.redirect(302, destination);
  } catch (err) {
    console.error("CLICK TRACKING ERROR:", err.message);
    res.status(500).send("Tracking error");
  }
});

export default router;
