import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

// GET /api/conversions?campaign_id=&affiliate_id=&status=&from=&to=
router.get("/", orgAuth, async (req, res) => {
  try {
    const { campaign_id, affiliate_id, status, from, to } = req.query;
    let query = `SELECT cv.*, c.name AS campaign_name, a.name AS advertiser_name, af.name AS affiliate_name
                 FROM conversions cv
                 JOIN campaigns c ON c.id = cv.campaign_id
                 JOIN advertisers a ON a.id = c.advertiser_id
                 LEFT JOIN affiliates af ON af.id = cv.affiliate_id
                 WHERE cv.org_id = $1`;
    const params = [req.orgId];
    if (campaign_id) { params.push(campaign_id); query += ` AND cv.campaign_id = $${params.length}`; }
    if (affiliate_id) { params.push(affiliate_id); query += ` AND cv.affiliate_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND cv.status = $${params.length}`; }
    if (from) { params.push(from); query += ` AND cv.created_at >= $${params.length}`; }
    if (to) { params.push(to); query += ` AND cv.created_at <= $${params.length}`; }
    query += ` ORDER BY cv.id DESC LIMIT 500`;
    const result = await pool.query(query, params);
    const data = result.rows.map(r => ({
      ...r,
      margin: r.status === "approved" ? Number(r.advertiser_payout || r.payout || 0) - Number(r.is_held ? 0 : (r.publisher_payout || 0)) : 0,
    }));
    res.json({ status: "SUCCESS", data });
  } catch (err) {
    console.error("GET CONVERSIONS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load conversions" });
  }
});

router.get("/summary", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'approved') AS total_conversions,
         COALESCE(SUM(payout) FILTER (WHERE status = 'approved'), 0) AS total_payout,
         COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE AND status = 'approved') AS today_conversions
       FROM conversions WHERE org_id = $1`,
      [req.orgId]
    );
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("CONVERSIONS SUMMARY ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load summary" });
  }
});

export default router;
