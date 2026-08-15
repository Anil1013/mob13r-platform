import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

// Base URL used to build the single tracking link handed to publishers/affiliates.
// Override with TRACK_BASE_URL env var if the tracking domain differs from the API domain.
const TRACK_BASE_URL = process.env.TRACK_BASE_URL || "https://backend.mob13r.com";

function generateSlug() {
  return crypto.randomBytes(6).toString("hex"); // 12-char unique slug
}

function buildTrackingUrl(slug) {
  return `${TRACK_BASE_URL}/click?cid=${slug}`;
}

router.get("/", orgAuth, async (req, res) => {
  try {
    const { vertical_id, advertiser_id, status } = req.query;
    let query = `SELECT c.*, v.name AS vertical_name, v.code AS vertical_code,
                   a.name AS advertiser_name
                 FROM campaigns c
                 JOIN verticals v ON v.id = c.vertical_id
                 JOIN advertisers a ON a.id = c.advertiser_id
                 WHERE c.org_id = $1`;
    const params = [req.orgId];
    if (vertical_id) { params.push(vertical_id); query += ` AND c.vertical_id = $${params.length}`; }
    if (advertiser_id) { params.push(advertiser_id); query += ` AND c.advertiser_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND c.status = $${params.length}`; }
    query += ` ORDER BY c.id DESC`;
    const result = await pool.query(query, params);
    const data = result.rows.map(r => ({ ...r, tracking_url: buildTrackingUrl(r.tracking_slug) }));
    res.json({ status: "SUCCESS", data });
  } catch (err) {
    console.error("GET CAMPAIGNS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load campaigns" });
  }
});

router.get("/:id", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, v.name AS vertical_name, a.name AS advertiser_name
       FROM campaigns c
       JOIN verticals v ON v.id = c.vertical_id
       JOIN advertisers a ON a.id = c.advertiser_id
       WHERE c.id = $1 AND c.org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Campaign not found" });
    const row = result.rows[0];
    res.json({ status: "SUCCESS", data: { ...row, tracking_url: buildTrackingUrl(row.tracking_slug) } });
  } catch (err) {
    console.error("GET CAMPAIGN ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load campaign" });
  }
});

// CREATE — this is the single tracking URL that gets pushed to the advertiser
router.post("/", orgAuth, async (req, res) => {
  try {
    const { vertical_id, advertiser_id, name, destination_url, payout, currency, geo, daily_cap } = req.body;
    if (!vertical_id || !advertiser_id || !name || !destination_url) {
      return res.status(400).json({ status: "FAILED", message: "vertical_id, advertiser_id, name and destination_url are required" });
    }
    if (!/^https?:\/\/.+/i.test(destination_url.trim())) {
      return res.status(400).json({ status: "FAILED", message: "destination_url must start with http:// or https://" });
    }
    if (payout !== undefined && payout !== null && payout !== "" && (isNaN(Number(payout)) || Number(payout) < 0)) {
      return res.status(400).json({ status: "FAILED", message: "payout must be a positive number" });
    }
    if (daily_cap !== undefined && daily_cap !== null && daily_cap !== "" && (!Number.isInteger(Number(daily_cap)) || Number(daily_cap) < 1)) {
      return res.status(400).json({ status: "FAILED", message: "daily_cap must be a whole number ≥ 1" });
    }

    let slug = generateSlug();
    // extremely unlikely collision, but guard anyway
    for (let i = 0; i < 5; i++) {
      const exists = await pool.query(`SELECT id FROM campaigns WHERE tracking_slug = $1`, [slug]);
      if (!exists.rows.length) break;
      slug = generateSlug();
    }

    const result = await pool.query(
      `INSERT INTO campaigns
        (org_id, vertical_id, advertiser_id, name, tracking_slug, destination_url, payout, currency, geo, daily_cap, status, last_reset_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',CURRENT_DATE) RETURNING *`,
      [req.orgId, vertical_id, advertiser_id, name.trim(), slug, destination_url.trim(),
       Number(payout) || 0, (currency || "USD").trim().toUpperCase(), (geo || "").trim().toUpperCase(), daily_cap || null]
    );
    const row = result.rows[0];
    res.json({ status: "SUCCESS", data: { ...row, tracking_url: buildTrackingUrl(row.tracking_slug) } });
  } catch (err) {
    console.error("CREATE CAMPAIGN ERROR:", err.message);
    if (err.code === "23503") {
      return res.status(400).json({ status: "FAILED", message: "Invalid vertical or advertiser selected" });
    }
    res.status(500).json({ status: "FAILED", message: "Failed to create campaign" });
  }
});

router.patch("/:id", orgAuth, async (req, res) => {
  try {
    const { name, destination_url, payout, currency, geo, daily_cap, status } = req.body;

    if (destination_url !== undefined && destination_url !== null && !/^https?:\/\/.+/i.test(String(destination_url).trim())) {
      return res.status(400).json({ status: "FAILED", message: "destination_url must start with http:// or https://" });
    }
    if (payout !== undefined && payout !== null && (isNaN(Number(payout)) || Number(payout) < 0)) {
      return res.status(400).json({ status: "FAILED", message: "payout must be a positive number" });
    }
    if (daily_cap !== undefined && daily_cap !== null && (!Number.isInteger(Number(daily_cap)) || Number(daily_cap) < 1)) {
      return res.status(400).json({ status: "FAILED", message: "daily_cap must be a whole number ≥ 1" });
    }
    if (status !== undefined && status !== null && !["active", "paused"].includes(status)) {
      return res.status(400).json({ status: "FAILED", message: "Invalid status" });
    }

    // daily_cap intentionally allows explicit null (clears the cap) — so we only
    // fall back to the existing value when the key is entirely absent from the request.
    const hasDailyCap = Object.prototype.hasOwnProperty.call(req.body, "daily_cap");

    const result = await pool.query(
      `UPDATE campaigns SET
        name = COALESCE($1, name),
        destination_url = COALESCE($2, destination_url),
        payout = COALESCE($3, payout),
        currency = COALESCE($4, currency),
        geo = COALESCE($5, geo),
        daily_cap = CASE WHEN $6 THEN $7 ELSE daily_cap END,
        status = COALESCE($8, status)
       WHERE id = $9 AND org_id = $10 RETURNING *`,
      [name?.trim() || null, destination_url?.trim() || null, payout ?? null,
       currency?.trim().toUpperCase() || null, geo?.trim().toUpperCase() || null,
       hasDailyCap, hasDailyCap ? (daily_cap === "" ? null : daily_cap) : null,
       status || null, req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Campaign not found" });
    const row = result.rows[0];
    res.json({ status: "SUCCESS", data: { ...row, tracking_url: buildTrackingUrl(row.tracking_slug) } });
  } catch (err) {
    console.error("UPDATE CAMPAIGN ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update campaign" });
  }
});

router.patch("/:id/status", orgAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "paused"].includes(status)) return res.status(400).json({ status: "FAILED", message: "Invalid status" });
    const result = await pool.query(
      `UPDATE campaigns SET status = $1 WHERE id = $2 AND org_id = $3 RETURNING *`,
      [status, req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Campaign not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("TOGGLE CAMPAIGN STATUS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update status" });
  }
});

export default router;
