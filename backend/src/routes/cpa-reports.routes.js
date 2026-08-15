import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

// The report is ALWAYS at full detail grain — every row shows Advertiser,
// Publisher, Campaign, Geo, and Carrier together, no matter what "group_by"
// is. "group_by" only changes the sort order the rows come back in; the
// frontend uses that same order to draw subtotal rows per group. Nothing
// ever disappears from the table.
const ORDER_MAP = {
  advertiser: "a.name ASC, clicks DESC",
  publisher: "publisher_name ASC, clicks DESC",
  campaign: "c.name ASC, clicks DESC",
  geo: "geo ASC, clicks DESC",
  carrier: "carrier ASC, clicks DESC",
  detailed: "clicks DESC",
};

// GET /api/cpa-reports?group_by=detailed|advertiser|publisher|campaign|geo|carrier
//                       &from=&to=&vertical_id=&campaign_id=&affiliate_id=&advertiser_id=&geo=&carrier=
router.get("/", orgAuth, async (req, res) => {
  try {
    const { group_by = "detailed", from, to, vertical_id, campaign_id, affiliate_id, advertiser_id, geo, carrier } = req.query;
    const orderBy = ORDER_MAP[group_by] || ORDER_MAP.detailed;

    let query = `
      SELECT a.name AS advertiser_name, COALESCE(af.name, 'Direct / Unknown') AS publisher_name,
        c.name AS campaign_name, COALESCE(NULLIF(c.geo, ''), 'Unknown') AS geo,
        COALESCE(NULLIF(c.carrier, ''), 'Unknown') AS carrier,
        COUNT(DISTINCT cl.id) AS clicks,
        COUNT(DISTINCT cv.id) FILTER (WHERE cv.status = 'approved') AS conversions_in,
        COUNT(DISTINCT cv.id) FILTER (WHERE cv.status = 'approved' AND cv.is_held = FALSE) AS conversions_out,
        COALESCE(SUM(cv.advertiser_payout) FILTER (WHERE cv.status = 'approved'), 0) AS revenue,
        COALESCE(SUM(cv.publisher_payout) FILTER (WHERE cv.status = 'approved' AND cv.is_held = FALSE), 0) AS publisher_cost
      FROM clicks cl
      JOIN campaigns c ON c.id = cl.campaign_id
      JOIN advertisers a ON a.id = c.advertiser_id
      JOIN verticals v ON v.id = c.vertical_id
      LEFT JOIN affiliates af ON af.id = cl.affiliate_id
      LEFT JOIN conversions cv ON cv.click_id = cl.click_id
      WHERE cl.org_id = $1`;
    const params = [req.orgId];

    if (from) { params.push(from); query += ` AND cl.created_at >= $${params.length}`; }
    if (to) { params.push(to); query += ` AND cl.created_at <= $${params.length}`; }
    if (vertical_id) { params.push(vertical_id); query += ` AND c.vertical_id = $${params.length}`; }
    if (campaign_id) { params.push(campaign_id); query += ` AND cl.campaign_id = $${params.length}`; }
    if (affiliate_id) { params.push(affiliate_id); query += ` AND cl.affiliate_id = $${params.length}`; }
    if (advertiser_id) { params.push(advertiser_id); query += ` AND c.advertiser_id = $${params.length}`; }
    if (geo) { params.push(geo); query += ` AND c.geo = $${params.length}`; }
    if (carrier) { params.push(carrier); query += ` AND c.carrier = $${params.length}`; }

    query += ` GROUP BY a.id, a.name, af.id, af.name, c.id, c.name, c.geo, c.carrier
               ORDER BY ${orderBy} LIMIT 1000`;

    const result = await pool.query(query, params);
    const data = result.rows.map(r => ({
      advertiser_name: r.advertiser_name,
      publisher_name: r.publisher_name,
      campaign_name: r.campaign_name,
      geo: r.geo,
      carrier: r.carrier,
      clicks: Number(r.clicks),
      conversions_in: Number(r.conversions_in),
      conversions_out: Number(r.conversions_out),
      cr_in: r.clicks > 0 ? ((r.conversions_in / r.clicks) * 100).toFixed(2) : "0.00",
      cr_out: r.clicks > 0 ? ((r.conversions_out / r.clicks) * 100).toFixed(2) : "0.00",
      revenue: Number(r.revenue),
      publisher_cost: Number(r.publisher_cost),
      margin: Number(r.revenue) - Number(r.publisher_cost),
    }));

    const totals = data.reduce((acc, r) => ({
      clicks: acc.clicks + r.clicks,
      conversions_in: acc.conversions_in + r.conversions_in,
      conversions_out: acc.conversions_out + r.conversions_out,
      revenue: acc.revenue + r.revenue,
      publisher_cost: acc.publisher_cost + r.publisher_cost,
      margin: acc.margin + r.margin,
    }), { clicks: 0, conversions_in: 0, conversions_out: 0, revenue: 0, publisher_cost: 0, margin: 0 });

    res.json({ status: "SUCCESS", data, totals, mode: group_by });
  } catch (err) {
    console.error("CPA REPORTS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load report" });
  }
});

export default router;
