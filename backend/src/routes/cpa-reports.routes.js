import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

const GROUP_MAP = {
  campaign: { label: "c.name", groupCol: "c.id, c.name" },
  affiliate: { label: "COALESCE(af.name, 'Direct / Unknown')", groupCol: "af.id, af.name" },
  geo: { label: "COALESCE(NULLIF(cl.geo, ''), 'Unknown')", groupCol: "cl.geo" },
  date: { label: "cl.created_at::date", groupCol: "cl.created_at::date" },
  vertical: { label: "v.name", groupCol: "v.id, v.name" },
};

// GET /api/cpa-reports?group_by=campaign|affiliate|geo|date|vertical&from=&to=&vertical_id=&campaign_id=&affiliate_id=
router.get("/", orgAuth, async (req, res) => {
  try {
    const { group_by = "campaign", from, to, vertical_id, campaign_id, affiliate_id } = req.query;
    const g = GROUP_MAP[group_by] || GROUP_MAP.campaign;

    let query = `
      SELECT ${g.label} AS label,
        COUNT(DISTINCT cl.id) AS clicks,
        COUNT(DISTINCT cv.id) FILTER (WHERE cv.status = 'approved') AS conversions,
        COALESCE(SUM(cv.payout) FILTER (WHERE cv.status = 'approved'), 0) AS revenue
      FROM clicks cl
      JOIN campaigns c ON c.id = cl.campaign_id
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

    query += ` GROUP BY ${g.groupCol} ORDER BY clicks DESC LIMIT 500`;

    const result = await pool.query(query, params);
    const data = result.rows.map(r => ({
      label: r.label,
      clicks: Number(r.clicks),
      conversions: Number(r.conversions),
      revenue: Number(r.revenue),
      cr: r.clicks > 0 ? ((r.conversions / r.clicks) * 100).toFixed(2) : "0.00",
    }));

    const totals = data.reduce((acc, r) => ({
      clicks: acc.clicks + r.clicks,
      conversions: acc.conversions + r.conversions,
      revenue: acc.revenue + r.revenue,
    }), { clicks: 0, conversions: 0, revenue: 0 });

    res.json({ status: "SUCCESS", data, totals });
  } catch (err) {
    console.error("CPA REPORTS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load report" });
  }
});

export default router;
