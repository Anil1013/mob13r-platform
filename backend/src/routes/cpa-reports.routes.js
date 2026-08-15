import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

// Each mode aggregates ONLY on that one dimension — e.g. "advertiser" gives one row
// PER advertiser, totalled across every campaign/publisher/geo/carrier they have.
const GROUP_MAP = {
  advertiser: { label: "a.name", groupCol: "a.id, a.name" },
  publisher: { label: "COALESCE(af.name, 'Direct / Unknown')", groupCol: "af.id, af.name" },
  affiliate: { label: "COALESCE(af.name, 'Direct / Unknown')", groupCol: "af.id, af.name" }, // alias, kept for backward compatibility
  campaign: { label: "c.name", groupCol: "c.id, c.name, a.name", extra: "a.name AS advertiser_name" },
  geo: { label: "COALESCE(NULLIF(c.geo, ''), 'Unknown')", groupCol: "c.geo" },
  carrier: { label: "COALESCE(NULLIF(c.carrier, ''), 'Unknown')", groupCol: "c.carrier" },
  vertical: { label: "v.name", groupCol: "v.id, v.name" },
  date: { label: "cl.created_at::date", groupCol: "cl.created_at::date" },
};

// GET /api/cpa-reports?group_by=advertiser|publisher|campaign|geo|carrier|vertical|date|advertiser_publisher
//                       &from=&to=&vertical_id=&campaign_id=&affiliate_id=&advertiser_id=&geo=&carrier=
router.get("/", orgAuth, async (req, res) => {
  try {
    const { group_by = "advertiser_publisher", from, to, vertical_id, campaign_id, affiliate_id, advertiser_id, geo, carrier } = req.query;

    // Detailed breakdown — one row per (advertiser, publisher, campaign) combo,
    // so Campaign/Geo/Carrier come along for free (each campaign has exactly one of each).
    if (group_by === "advertiser_publisher") {
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
      query += ` GROUP BY a.id, a.name, af.id, af.name, c.id, c.name, c.geo, c.carrier ORDER BY clicks DESC LIMIT 500`;

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
      return res.json({ status: "SUCCESS", data, totals: sumTotals(data), mode: "advertiser_publisher" });
    }

    // Single-dimension grouping — Advertiser, Publisher, Campaign, Geo, Carrier, Vertical, or Date.
    // Every mode gets the SAME columns (clicks, CR in/out, revenue, publisher cost, margin),
    // totalled across everything else. e.g. "Group by Advertiser" = that advertiser's total
    // across ALL their campaigns/publishers/geos/carriers.
    const g = GROUP_MAP[group_by] || GROUP_MAP.advertiser;

    let query = `
      SELECT ${g.label} AS label,${g.extra ? ` ${g.extra},` : ""}
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

    query += ` GROUP BY ${g.groupCol} ORDER BY clicks DESC LIMIT 500`;

    const result = await pool.query(query, params);
    const data = result.rows.map(r => ({
      label: r.label,
      advertiser_name: r.advertiser_name,
      clicks: Number(r.clicks),
      conversions_in: Number(r.conversions_in),
      conversions_out: Number(r.conversions_out),
      cr_in: r.clicks > 0 ? ((r.conversions_in / r.clicks) * 100).toFixed(2) : "0.00",
      cr_out: r.clicks > 0 ? ((r.conversions_out / r.clicks) * 100).toFixed(2) : "0.00",
      revenue: Number(r.revenue),
      publisher_cost: Number(r.publisher_cost),
      margin: Number(r.revenue) - Number(r.publisher_cost),
    }));

    res.json({ status: "SUCCESS", data, totals: sumTotals(data), mode: group_by });
  } catch (err) {
    console.error("CPA REPORTS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load report" });
  }
});

function sumTotals(rows) {
  return rows.reduce((acc, r) => ({
    clicks: acc.clicks + r.clicks,
    conversions_in: acc.conversions_in + r.conversions_in,
    conversions_out: acc.conversions_out + r.conversions_out,
    revenue: acc.revenue + r.revenue,
    publisher_cost: acc.publisher_cost + r.publisher_cost,
    margin: acc.margin + r.margin,
  }), { clicks: 0, conversions_in: 0, conversions_out: 0, revenue: 0, publisher_cost: 0, margin: 0 });
}

export default router;
