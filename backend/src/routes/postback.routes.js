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

// Finds the publisher_assignment that applies to this click — an exact
// campaign-level assignment wins over a group-level one.
async function findAssignment(affiliateId, campaignId) {
  const res = await pool.query(
    `SELECT pa.* FROM publisher_assignments pa
     WHERE pa.affiliate_id = $1 AND pa.status = 'active'
       AND (
         pa.campaign_id = $2
         OR pa.group_id IN (SELECT group_id FROM campaign_group_items WHERE campaign_id = $2)
       )
     ORDER BY pa.campaign_id IS NULL ASC
     LIMIT 1`,
    [affiliateId, campaignId]
  );
  return res.rows[0] || null;
}

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

    // This is what the ADVERTISER pays us (revenue side).
    const advertiserPayout = payout !== undefined ? Number(payout) : Number(campaign?.payout || 0);
    const finalStatus = status || "approved";

    // Look up the publisher's own payout + hold % for this campaign/group.
    // SAFE DEFAULT: if no assignment exists between this publisher and this
    // campaign, publisher_payout is 0 and we do NOT forward the postback to
    // them — no assignment means no payout obligation. (Previously this
    // defaulted to the FULL advertiser payout, silently zeroing out margin
    // on any conversion where an assignment was forgotten — that was risky.)
    let publisherPayout = 0;
    let holdPercent = 0;
    let hasAssignment = false;
    if (click.affiliate_id) {
      const assignment = await findAssignment(click.affiliate_id, click.campaign_id);
      if (assignment) {
        hasAssignment = true;
        publisherPayout = Number(assignment.publisher_payout);
        holdPercent = Number(assignment.hold_percent) || 0;
      }
    }

    // Hold logic: randomly withhold hold_percent% of conversions from the publisher
    // (they still count as a valid conversion for our own revenue/reporting — they
    // just don't get forwarded, e.g. for quality control or margin management).
    // No assignment at all is treated the same as "fully held" — nothing forwarded.
    const isHeld = !hasAssignment || (holdPercent > 0 && Math.random() * 100 < holdPercent);

    const insertRes = await pool.query(
      `INSERT INTO conversions
        (org_id, click_id, campaign_id, affiliate_id, status, payout, advertiser_payout, publisher_payout, is_held, transaction_id, raw_params)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (click_id) DO NOTHING RETURNING *`,
      [click.org_id, click_id, click.campaign_id, click.affiliate_id, finalStatus, advertiserPayout,
       advertiserPayout, publisherPayout, isHeld, transaction_id || null, JSON.stringify(req.query)]
    );

    if (!insertRes.rows.length) {
      return res.json({ status: "SUCCESS", message: "Duplicate postback ignored (already recorded)" });
    }

    await pool.query(`UPDATE campaigns SET today_conversions = today_conversions + 1 WHERE id = $1`, [click.campaign_id]);

    let forwarded = false;
    if (click.affiliate_id && !isHeld) {
      const affRes = await pool.query(`SELECT postback_url FROM affiliates WHERE id = $1`, [click.affiliate_id]);
      const postbackUrl = affRes.rows[0]?.postback_url;
      if (postbackUrl) {
        forwarded = await forwardToPublisher({
          postbackUrl,
          clickId: click_id,
          status: finalStatus,
          payout: publisherPayout,
          transactionId: transaction_id,
        });
        if (forwarded) {
          await pool.query(`UPDATE conversions SET postback_forwarded = TRUE WHERE click_id = $1`, [click_id]);
        }
      }
    }

    res.json({
      status: "SUCCESS", message: "Conversion recorded", held: isHeld, forwarded_to_publisher: forwarded,
      ...(click.affiliate_id && !hasAssignment
        ? { warning: "No publisher assignment exists for this affiliate+campaign — publisher_payout recorded as 0 and nothing was forwarded. Create an assignment on /cpa/assignments to start paying/forwarding this publisher." }
        : {}),
    });
  } catch (err) {
    console.error("POSTBACK ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Postback processing error" });
  }
});

export default router;
