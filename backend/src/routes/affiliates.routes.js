import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();
const TRACK_BASE_URL = process.env.TRACK_BASE_URL || "https://backend.mob13r.com";

function generateAffiliateKey() {
  return "aff_" + crypto.randomBytes(10).toString("hex");
}

router.get("/", orgAuth, async (req, res) => {
  try {
    const { vertical_id } = req.query;
    const params = [req.orgId];
    let query = `SELECT af.id, af.name, af.email, af.affiliate_key, af.status, af.created_at, af.postback_url,
         COUNT(DISTINCT cl.id) AS total_clicks,
         COUNT(DISTINCT cv.id) FILTER (WHERE cv.status = 'approved') AS total_conversions,
         COALESCE(SUM(cv.payout) FILTER (WHERE cv.status = 'approved'), 0) AS total_revenue
       FROM affiliates af
       LEFT JOIN clicks cl ON cl.affiliate_id = af.id
       LEFT JOIN conversions cv ON cv.affiliate_id = af.id
       WHERE af.org_id = $1`;
    if (vertical_id) {
      // A publisher "belongs" to a vertical if they've sent traffic there OR
      // have an assignment (direct campaign, or a group containing a campaign) in it.
      params.push(vertical_id);
      query += ` AND (
        EXISTS (SELECT 1 FROM clicks c2 JOIN campaigns camp ON camp.id = c2.campaign_id WHERE c2.affiliate_id = af.id AND camp.vertical_id = $${params.length})
        OR EXISTS (
          SELECT 1 FROM publisher_assignments pa
          LEFT JOIN campaigns pc ON pc.id = pa.campaign_id
          LEFT JOIN campaign_group_items gi ON gi.group_id = pa.group_id
          LEFT JOIN campaigns gc ON gc.id = gi.campaign_id
          WHERE pa.affiliate_id = af.id AND (pc.vertical_id = $${params.length} OR gc.vertical_id = $${params.length})
        )
      )`;
    }
    query += ` GROUP BY af.id ORDER BY af.id DESC`;
    const result = await pool.query(query, params);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET AFFILIATES ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load affiliates" });
  }
});

router.post("/", orgAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ status: "FAILED", message: "Affiliate name required" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ status: "FAILED", message: "Invalid email address" });
    }
    const key = generateAffiliateKey();
    const result = await pool.query(
      `INSERT INTO affiliates (org_id, name, email, affiliate_key, status)
       VALUES ($1,$2,$3,$4,'active') RETURNING *`,
      [req.orgId, name.trim(), email ? email.trim() : null, key]
    );
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("CREATE AFFILIATE ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to create affiliate" });
  }
});

router.patch("/:id/status", orgAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "paused"].includes(status)) return res.status(400).json({ status: "FAILED", message: "Invalid status" });
    const result = await pool.query(
      `UPDATE affiliates SET status = $1 WHERE id = $2 AND org_id = $3 RETURNING *`,
      [status, req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Affiliate not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE AFFILIATE STATUS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update status" });
  }
});

// Personalized tracking links for this affiliate across all active campaigns
router.get("/:id/campaigns", orgAuth, async (req, res) => {
  try {
    const affRes = await pool.query(`SELECT * FROM affiliates WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    if (!affRes.rows.length) return res.status(404).json({ status: "FAILED", message: "Affiliate not found" });
    const affiliate = affRes.rows[0];

    const camps = await pool.query(
      `SELECT c.*, v.name AS vertical_name FROM campaigns c
       JOIN verticals v ON v.id = c.vertical_id
       WHERE c.org_id = $1 AND c.status = 'active' ORDER BY c.id DESC`,
      [req.orgId]
    );
    const data = camps.rows.map(c => ({
      ...c,
      tracking_url: `${TRACK_BASE_URL}/click?cid=${c.tracking_slug}&aff_id=${affiliate.affiliate_key}`,
    }));
    res.json({ status: "SUCCESS", data });
  } catch (err) {
    console.error("GET AFFILIATE CAMPAIGNS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load campaigns" });
  }
});

// Single postback URL — where WE forward conversions to this publisher (S2S).
// Editing this always updates the same field; there's only ever one per publisher.
router.patch("/:id/postback", orgAuth, async (req, res) => {
  try {
    const { postback_url } = req.body;

    if (postback_url !== null && postback_url !== "") {
      if (!postback_url || !/^https?:\/\/.+/i.test(postback_url.trim())) {
        return res.status(400).json({ status: "FAILED", message: "postback_url must start with http:// or https://" });
      }
      if (!postback_url.includes("{click_id}")) {
        return res.status(400).json({ status: "FAILED", message: "postback_url must include the {click_id} macro so we can identify the conversion" });
      }
    }

    const value = (postback_url === null || postback_url === "") ? null : postback_url.trim();
    const result = await pool.query(
      `UPDATE affiliates SET postback_url = $1 WHERE id = $2 AND org_id = $3 RETURNING *`,
      [value, req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Affiliate not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE AFFILIATE POSTBACK ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update postback url" });
  }
});

export default router;
