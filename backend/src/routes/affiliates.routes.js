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
    const result = await pool.query(
      `SELECT af.id, af.name, af.email, af.affiliate_key, af.status, af.created_at,
         COUNT(DISTINCT cl.id) AS total_clicks,
         COUNT(DISTINCT cv.id) FILTER (WHERE cv.status = 'approved') AS total_conversions,
         COALESCE(SUM(cv.payout) FILTER (WHERE cv.status = 'approved'), 0) AS total_revenue
       FROM affiliates af
       LEFT JOIN clicks cl ON cl.affiliate_id = af.id
       LEFT JOIN conversions cv ON cv.affiliate_id = af.id
       WHERE af.org_id = $1
       GROUP BY af.id ORDER BY af.id DESC`,
      [req.orgId]
    );
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET AFFILIATES ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load affiliates" });
  }
});

router.post("/", orgAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name) return res.status(400).json({ status: "FAILED", message: "Affiliate name required" });
    const key = generateAffiliateKey();
    const result = await pool.query(
      `INSERT INTO affiliates (org_id, name, email, affiliate_key, status)
       VALUES ($1,$2,$3,$4,'active') RETURNING *`,
      [req.orgId, name, email || null, key]
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

// Postback URLs — where WE forward conversions to this affiliate (S2S)
router.get("/:id/postback-urls", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pb.* FROM affiliate_postbacks pb
       JOIN affiliates af ON af.id = pb.affiliate_id
       WHERE pb.affiliate_id = $1 AND af.org_id = $2 ORDER BY pb.id DESC`,
      [req.params.id, req.orgId]
    );
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET AFFILIATE POSTBACKS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load postback urls" });
  }
});

router.post("/:id/postback-urls", orgAuth, async (req, res) => {
  try {
    const { postback_url, campaign_id } = req.body;
    if (!postback_url) return res.status(400).json({ status: "FAILED", message: "postback_url required" });
    const affCheck = await pool.query(`SELECT id FROM affiliates WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    if (!affCheck.rows.length) return res.status(404).json({ status: "FAILED", message: "Affiliate not found" });
    const result = await pool.query(
      `INSERT INTO affiliate_postbacks (affiliate_id, campaign_id, postback_url) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, campaign_id || null, postback_url]
    );
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("ADD AFFILIATE POSTBACK ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to add postback url" });
  }
});

router.delete("/postback-urls/:pbId", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM affiliate_postbacks pb USING affiliates af
       WHERE pb.id = $1 AND pb.affiliate_id = af.id AND af.org_id = $2 RETURNING pb.id`,
      [req.params.pbId, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Postback url not found" });
    res.json({ status: "SUCCESS", message: "Deleted" });
  } catch (err) {
    console.error("DELETE AFFILIATE POSTBACK ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to delete postback url" });
  }
});

export default router;
