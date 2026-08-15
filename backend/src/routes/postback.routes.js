import express from "express";
import axios from "axios";
import pool from "../db.js";

const router = express.Router();

function fillMacros(url, map) {
  let out = url;
  for (const [key, val] of Object.entries(map)) {
    out = out.split(`{${key}}`).join(encodeURIComponent(val ?? ""));
  }
  return out;
}

async function forwardToAffiliate({ affiliateId, campaignId, clickId, status, payout, transactionId }) {
  try {
    const pbRes = await pool.query(
      `SELECT * FROM affiliate_postbacks
       WHERE affiliate_id = $1 AND status = 'active'
         AND (campaign_id = $2 OR campaign_id IS NULL)
       ORDER BY campaign_id NULLS LAST`,
      [affiliateId, campaignId]
    );
    for (const pb of pbRes.rows) {
      const url = fillMacros(pb.postback_url, {
        click_id: clickId,
        status,
        payout,
        transaction_id: transactionId || "",
      });
      axios.get(url, { timeout: 8000 }).catch(e =>
        console.error("AFFILIATE POSTBACK FORWARD FAILED:", pb.id, e.message)
      );
    }
    return pbRes.rows.length > 0;
  } catch (err) {
    console.error("FORWARD POSTBACK ERROR:", err.message);
    return false;
  }
}

// PUBLIC: GET /postback?click_id=xxx&status=approved&payout=1.5&transaction_id=xxx
// This is what the advertiser calls (server-to-server) when a conversion happens.
router.get("/postback", async (req, res) => {
  try {
    const { click_id, status, payout, transaction_id } = req.query;
    if (!click_id) return res.status(400).json({ status: "FAILED", message: "click_id is required" });

    const clickRes = await pool.query(`SELECT * FROM clicks WHERE click_id = $1`, [click_id]);
    if (!clickRes.rows.length) return res.status(404).json({ status: "FAILED", message: "click_id not found" });
    const click = clickRes.rows[0];

    const campRes = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [click.campaign_id]);
    const campaign = campRes.rows[0];

    const finalPayout = payout !== undefined ? Number(payout) : Number(campaign?.payout || 0);
    const finalStatus = status || "approved";

    const insertRes = await pool.query(
      `INSERT INTO conversions (org_id, click_id, campaign_id, affiliate_id, status, payout, transaction_id, raw_params)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (click_id) DO NOTHING RETURNING *`,
      [click.org_id, click_id, click.campaign_id, click.affiliate_id, finalStatus, finalPayout,
       transaction_id || null, JSON.stringify(req.query)]
    );

    if (!insertRes.rows.length) {
      return res.json({ status: "SUCCESS", message: "Duplicate postback ignored (already recorded)" });
    }

    await pool.query(`UPDATE campaigns SET today_conversions = today_conversions + 1 WHERE id = $1`, [click.campaign_id]);

    let forwarded = false;
    if (click.affiliate_id) {
      forwarded = await forwardToAffiliate({
        affiliateId: click.affiliate_id,
        campaignId: click.campaign_id,
        clickId: click_id,
        status: finalStatus,
        payout: finalPayout,
        transactionId: transaction_id,
      });
      if (forwarded) {
        await pool.query(`UPDATE conversions SET postback_forwarded = TRUE WHERE click_id = $1`, [click_id]);
      }
    }

    res.json({ status: "SUCCESS", message: "Conversion recorded", forwarded_to_affiliate: forwarded });
  } catch (err) {
    console.error("POSTBACK ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Postback processing error" });
  }
});

export default router;
