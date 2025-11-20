// backend/routes/clicks.js  (replace existing or merge)
import express from "express";
import pool from "../db.js";
const router = express.Router();

/**
 * GET /click?pub_id=PUB03&geo=BD&carrier=Robi&...other params
 *
 * Chooses a rule via weighted random selection and redirects to the associated tracking URL.
 */
router.get("/", async (req, res) => {
  const { pub_id, geo, carrier } = req.query;
  if (!pub_id || !geo || !carrier) {
    return res.status(400).send("missing pub_id/geo/carrier");
  }

  try {
    // Fetch active rules matching the pub/geo/carrier
    const rulesQ = `
      SELECT tr.*, ptl.tracking_url, ptl.pin_send_url, ptl.pin_verify_url, ptl.check_status_url, ptl.portal_url, o.code AS offer_code
      FROM traffic_rules tr
      JOIN publisher_tracking_links ptl ON ptl.id = tr.tracking_link_id
      LEFT JOIN offers o ON o.id = tr.offer_id
      WHERE tr.pub_id = $1
        AND tr.geo = $2
        AND tr.carrier = $3
        AND tr.status = 'active'
    `;
    const { rows } = await pool.query(rulesQ, [pub_id, geo, carrier]);

    if (!rows || rows.length === 0) {
      return res.status(404).send("no rules for this pub/geo/carrier");
    }

    // Weighted random selection
    const totalWeight = rows.reduce((s, r) => s + (r.weight || 0), 0);
    let rnd = Math.random() * totalWeight;
    let chosen = rows[rows.length - 1];
    for (const r of rows) {
      rnd -= (r.weight || 0);
      if (rnd <= 0) {
        chosen = r;
        break;
      }
    }

    // Determine redirect URL (Option A/B)
    // Prefer explicit redirect_url in rule, else choose based on type
    let redirectUrl = chosen.redirect_url || null;
    if (!redirectUrl) {
      // If tracking_url exists -> Option A
      if (chosen.tracking_url) {
        redirectUrl = chosen.tracking_url;
      } else if (chosen.type && chosen.type.toUpperCase() === "INAPP") {
        // Option B: use pin_send_url as primary redirect for INAPP (you can change rules)
        // We'll redirect to pin_send_url by default.
        redirectUrl = chosen.pin_send_url || chosen.portal_url || chosen.check_status_url || chosen.tracking_url;
      } else {
        redirectUrl = chosen.tracking_url || chosen.portal_url || chosen.pin_send_url || chosen.check_status_url;
      }
    }

    // Append incoming query params (if you want to pass through click params)
    const urlObj = new URL(redirectUrl);
    // copy all request query params except pub_id/geo/carrier if desired
    Object.keys(req.query).forEach(k => {
      // avoid double-appending some params — keep pub_id/geo/carrier too if needed
      if (!urlObj.searchParams.has(k)) {
        urlObj.searchParams.set(k, req.query[k]);
      }
    });

    // Log the chosen rule/offer for debug (optional)
    // INSERT into traffic_logs if you have a logging table (not required here)
    // Redirect to chosen URL
    return res.redirect(urlObj.toString());
  } catch (err) {
    console.error("click redirect error:", err);
    return res.status(500).send("internal_error");
  }
});

export default router;
