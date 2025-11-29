// backend/src/routes/conversion.js
import express from "express";
import pool from "../db.js";
import fetch from "node-fetch";       // already used in fraudCheck.js
import https from "https";

const router = express.Router();

const agent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * Helper: build publisher postback URL with macros
 * Supported macros:
 *  {click_id} {tx_id} {payout} {pub_id} {offer_id} {geo} {carrier}
 */
function buildPublisherPostback(url, ctx) {
  let out = url;
  const map = {
    "{click_id}": ctx.click_id || "",
    "{tx_id}": ctx.tx_id || "",
    "{payout}": ctx.payout != null ? String(ctx.payout) : "",
    "{pub_id}": ctx.pub_id || "",
    "{offer_id}": ctx.offer_id != null ? String(ctx.offer_id) : "",
    "{geo}": ctx.geo || "",
    "{carrier}": ctx.carrier || "",
  };

  for (const [k, v] of Object.entries(map)) {
    out = out.replace(new RegExp(k, "g"), encodeURIComponent(v));
  }
  return out;
}

/**
 * GET /conversion
 * Example for advertiser:
 *   https://backend.mob13r.com/conversion?click_id={click_id}&payout={payout}&tx_id={tx_id}
 */
router.get("/", async (req, res) => {
  const { click_id, payout, tx_id } = req.query;

  if (!click_id) {
    return res.status(400).send("MISSING_CLICK_ID");
  }

  try {
    // 1) De-dupe by tx_id (best) or click_id
    if (tx_id) {
      const dupe = await pool.query(
        "SELECT id FROM conversions WHERE tx_id = $1 LIMIT 1",
        [tx_id]
      );
      if (dupe.rows.length) {
        return res.status(200).send("OK_DUP_TX");
      }
    } else {
      const dupe = await pool.query(
        "SELECT id FROM conversions WHERE click_id = $1 LIMIT 1",
        [click_id]
      );
      if (dupe.rows.length) {
        return res.status(200).send("OK_DUP_CLICK");
      }
    }

    // 2) Click lookup – try to map to pub/offer from analytics_clicks
    const clickRes = await pool.query(
      `
      SELECT pub_id, offer_id, geo, carrier, params
      FROM analytics_clicks
      WHERE (params->>'click_id') = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [click_id]
    );

    const clickRow = clickRes.rows[0] || {};
    const pub_id = clickRow.pub_id || null;
    const offer_id = clickRow.offer_id || null;
    const geo = clickRow.geo || null;
    const carrier = clickRow.carrier || null;

    // 3) Publisher & Offer/Advertiser names
    let publisher_name = null;
    if (pub_id) {
      const pubRes = await pool.query(
        "SELECT name FROM publishers WHERE pub_code = $1 LIMIT 1",
        [pub_id]
      );
      publisher_name = pubRes.rows[0]?.name || null;
    }

    let advertiser_name = null;
    let offer_name = null;
    if (offer_id) {
      const offerRes = await pool.query(
        `
        SELECT o.name AS offer_name, a.name AS advertiser_name
        FROM offers o
        LEFT JOIN advertisers a ON a.id = o.advertiser_id
        WHERE o.id = $1
        LIMIT 1
        `,
        [offer_id]
      );
      offer_name = offerRes.rows[0]?.offer_name || null;
      advertiser_name = offerRes.rows[0]?.advertiser_name || null;
    }

    const payoutNum = payout ? Number(payout) : 0;

    // 4) Save conversion
    const convRes = await pool.query(
      `
      INSERT INTO conversions (
        click_id,
        tx_id,
        pub_id,
        publisher_name,
        advertiser_name,
        offer_id,
        offer_name,
        geo,
        carrier,
        amount,
        status,
        raw_params,
        postback_received,
        validated_at,
        created_at,
        sent_to_publisher
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        'approved',
        $11,
        true,
        NOW(),
        NOW(),
        false
      )
      RETURNING *
      `,
      [
        click_id,
        tx_id || null,
        pub_id,
        publisher_name,
        advertiser_name,
        offer_id,
        offer_name,
        geo,
        carrier,
        payoutNum,
        JSON.stringify(req.query || {}),
      ]
    );

    const conv = convRes.rows[0];

    // 5) Fire publisher postback (if available)
    if (pub_id) {
      const pbRes = await pool.query(
        `
        SELECT postback_url
        FROM publisher_tracking_links
        WHERE pub_code = $1
        LIMIT 1
        `,
        [pub_id]
      );

      const template = pbRes.rows[0]?.postback_url;

      if (template) {
        const finalUrl = buildPublisherPostback(template, {
          click_id,
          tx_id,
          payout: payoutNum,
          pub_id,
          offer_id,
          geo,
          carrier,
        });

        try {
          const r = await fetch(finalUrl, { agent, timeout: 8000 });
          const ok = r.ok;

          await pool.query(
            `
            UPDATE conversions
            SET sent_to_publisher = $1
            WHERE id = $2
            `,
            [ok, conv.id]
          );
        } catch (err) {
          console.error("Publisher postback failed:", err.message || err);
        }
      }
    }

    // 6) Final response to advertiser
    return res.status(200).send("OK");
  } catch (err) {
    console.error("CONVERSION ERROR:", err);
    return res.status(500).send("ERROR");
  }
});

export default router;
