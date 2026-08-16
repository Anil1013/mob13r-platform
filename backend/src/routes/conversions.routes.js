import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

// GET /api/conversions?campaign_id=&affiliate_id=&advertiser_id=&vertical_id=&status=&from=&to=
router.get("/", orgAuth, async (req, res) => {
  try {
    const { campaign_id, affiliate_id, advertiser_id, vertical_id, status, from, to } = req.query;
    let query = `SELECT cv.*, c.name AS campaign_name, a.name AS advertiser_name, af.name AS affiliate_name
                 FROM conversions cv
                 JOIN campaigns c ON c.id = cv.campaign_id
                 JOIN advertisers a ON a.id = c.advertiser_id
                 LEFT JOIN affiliates af ON af.id = cv.affiliate_id
                 WHERE cv.org_id = $1`;
    const params = [req.orgId];
    if (campaign_id) { params.push(campaign_id); query += ` AND cv.campaign_id = $${params.length}`; }
    if (affiliate_id) { params.push(affiliate_id); query += ` AND cv.affiliate_id = $${params.length}`; }
    if (advertiser_id) { params.push(advertiser_id); query += ` AND c.advertiser_id = $${params.length}`; }
    if (vertical_id) { params.push(vertical_id); query += ` AND c.vertical_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND cv.status = $${params.length}`; }
    // IST-aware boundaries, matching the Reports page's date filtering (avoids the
    // UTC-cutoff bug where a single-day range leaked hours from the next IST day).
    if (from) { params.push(from); query += ` AND (cv.created_at AT TIME ZONE 'Asia/Kolkata') >= $${params.length}::date`; }
    if (to) { params.push(to); query += ` AND (cv.created_at AT TIME ZONE 'Asia/Kolkata') < $${params.length}::date + interval '1 day'`; }
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
    const { campaign_id, affiliate_id, advertiser_id, vertical_id, from, to } = req.query;
    let query = `
      SELECT
         COUNT(*) FILTER (WHERE cv.status = 'approved') AS total_conversions,
         COALESCE(SUM(cv.payout) FILTER (WHERE cv.status = 'approved'), 0) AS total_payout,
         COUNT(*) FILTER (WHERE (cv.created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND cv.status = 'approved') AS today_conversions
       FROM conversions cv
       JOIN campaigns c ON c.id = cv.campaign_id
       WHERE cv.org_id = $1`;
    const params = [req.orgId];
    if (campaign_id) { params.push(campaign_id); query += ` AND cv.campaign_id = $${params.length}`; }
    if (affiliate_id) { params.push(affiliate_id); query += ` AND cv.affiliate_id = $${params.length}`; }
    if (advertiser_id) { params.push(advertiser_id); query += ` AND c.advertiser_id = $${params.length}`; }
    if (vertical_id) { params.push(vertical_id); query += ` AND c.vertical_id = $${params.length}`; }
    if (from) { params.push(from); query += ` AND (cv.created_at AT TIME ZONE 'Asia/Kolkata') >= $${params.length}::date`; }
    if (to) { params.push(to); query += ` AND (cv.created_at AT TIME ZONE 'Asia/Kolkata') < $${params.length}::date + interval '1 day'`; }
    const result = await pool.query(query, params);
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("CONVERSIONS SUMMARY ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load summary" });
  }
});

export default router;
