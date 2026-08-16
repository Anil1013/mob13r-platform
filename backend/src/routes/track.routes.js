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

// Weighted-random pick among a traffic group's active campaigns (respecting
// each campaign's own status + daily cap). Returns the chosen campaign row,
// or null if nothing is eligible right now.
async function pickCampaignFromGroup(groupId) {
  const itemsRes = await pool.query(
    `SELECT gi.weight, c.* FROM campaign_group_items gi
     JOIN campaigns c ON c.id = gi.campaign_id
     WHERE gi.group_id = $1 AND gi.status = 'active' AND c.status = 'active'`,
    [groupId]
  );
  if (!itemsRes.rows.length) return null;

  // Reset any member campaign whose daily counter is still from a previous IST
  // day BEFORE checking caps — otherwise a fresh campaign can look wrongly
  // "capped" using yesterday's leftover today_clicks (the reset used to only
  // run for whichever campaign click.routes.js ended up picking, too late to
  // affect this eligibility check).
  const staleIds = itemsRes.rows.filter(c => {
    const resetDate = new Date(c.last_reset_date).toISOString().slice(0, 10);
    return resetDate !== new Date().toISOString().slice(0, 10); // cheap pre-filter; DB does the authoritative IST check below
  }).map(c => c.id);
  if (staleIds.length) {
    const resetRes = await pool.query(
      `UPDATE campaigns SET today_clicks = 0, today_conversions = 0,
         last_reset_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
       WHERE id = ANY($1) AND last_reset_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date
       RETURNING id`,
      [staleIds]
    );
    const resetIds = new Set(resetRes.rows.map(r => r.id));
    for (const c of itemsRes.rows) {
      if (resetIds.has(c.id)) { c.today_clicks = 0; c.today_conversions = 0; }
    }
  }

  let eligible = itemsRes.rows.filter(c => !c.daily_cap || c.today_clicks < c.daily_cap);
  if (!eligible.length) return null;

  const totalWeight = eligible.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) return null;

  let r = Math.random() * totalWeight;
  for (const c of eligible) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return eligible[eligible.length - 1];
}

// PUBLIC: GET /click?cid=<tracking_slug>&aff_id=<affiliate_key>&sub1..sub5=
// cid can be either a single campaign's slug OR a traffic group's slug —
// a traffic group transparently routes to one of its campaigns by weight %.
router.get("/click", async (req, res) => {
  try {
    const { cid, aff_id, sub1, sub2, sub3, sub4, sub5 } = req.query;
    if (!cid) return res.status(400).send("Missing cid");

    let campaign = null;

    const campRes = await pool.query(`SELECT * FROM campaigns WHERE tracking_slug = $1`, [cid]);
    if (campRes.rows.length) {
      campaign = campRes.rows[0];
      if (campaign.status !== "active") return res.status(410).send("Campaign is paused");
    } else {
      const groupRes = await pool.query(`SELECT * FROM campaign_groups WHERE tracking_slug = $1`, [cid]);
      if (!groupRes.rows.length) return res.status(404).send("Tracking link not found");
      const group = groupRes.rows[0];
      if (group.status !== "active") return res.status(410).send("Traffic group is paused");
      campaign = await pickCampaignFromGroup(group.id);
      if (!campaign) return res.status(429).send("No eligible campaign in this traffic group right now (all paused or capped)");
    }

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
