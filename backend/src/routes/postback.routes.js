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

// Forward the conversion to the publisher's single postback URL (if they've set one).
async function forwardToPublisher({ postbackUrl, clickId, status, payout, transactionId }) {
  try {
    const url = fillMacros(postbackUrl, {
      click_id: clickId,
      status,
      payout,
      transaction_id: transactionId || "",
    });
    axios.get(url, { timeout: 8000 }).catch(e =>
      console.error("PUBLISHER POSTBACK FORWARD FAILED:", e.message)
    );
    return true;
  } catch (err) {
    console.error("FORWARD POSTBACK ERROR:", err.message);
    return false;
  }
}

// PUBLIC: GET /postback?click_id=xxx&adv_key=xxx&status=approved&payout=1.5&transaction_id=xxx
// This is what the advertiser calls (server-to-server) when a conversion happens.
// adv_key is the advertiser's own unique postback key (each advertiser gets a distinct
// postback URL from the Advertisers page) — if present, it must match the advertiser
// on the campaign the click belongs to. Older integrations without adv_key still work.
router.get("/postback", async (req, res) => {
  try {
    const { click_id, adv_key, status, payout, transaction_id } = req.query;
    if (!click_id) return res.status(400).json({ status: "FAILED", message: "click_id is required" });

    const clickRes = await pool.query(`SELECT * FROM clicks WHERE click_id = $1`, [click_id]);
    if (!clickRes.rows.length) return res.status(404).json({ status: "FAILED", message: "click_id not found" });
    const click = clickRes.rows[0];

    const campRes = await pool.query(`SELECT * FROM campaigns WHERE id = $1`, [click.campaign_id]);
    const campaign = campRes.rows[0];
    if (!campaign) return res.status(404).json({ status: "FAILED", message: "campaign not found for this click" });

    if (adv_key) {
      const advRes = await pool.query(`SELECT postback_key FROM advertisers WHERE id = $1`, [campaign.advertiser_id]);
      const advertiser = advRes.rows[0];
      if (!advertiser || advertiser.postback_key !== adv_key) {
        return res.status(403).json({ status: "FAILED", message: "adv_key does not match this campaign's advertiser" });
      }
    }

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
      const affRes = await pool.query(`SELECT postback_url FROM affiliates WHERE id = $1`, [click.affiliate_id]);
      const postbackUrl = affRes.rows[0]?.postback_url;
      if (postbackUrl) {
        forwarded = await forwardToPublisher({
          postbackUrl,
          clickId: click_id,
          status: finalStatus,
          payout: finalPayout,
          transactionId: transaction_id,
        });
        if (forwarded) {
          await pool.query(`UPDATE conversions SET postback_forwarded = TRUE WHERE click_id = $1`, [click_id]);
        }
      }
    }

    res.json({ status: "SUCCESS", message: "Conversion recorded", forwarded_to_publisher: forwarded });
  } catch (err) {
    console.error("POSTBACK ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Postback processing error" });
  }
});

export default router;
