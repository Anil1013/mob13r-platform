import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();
const TRACK_BASE_URL = process.env.TRACK_BASE_URL || "https://backend.mob13r.com";

function generateSlug() {
  return "grp_" + crypto.randomBytes(6).toString("hex");
}
function buildTrackingUrl(slug) {
  return `${TRACK_BASE_URL}/click?cid=${slug}`;
}

router.get("/", orgAuth, async (req, res) => {
  try {
    const { vertical_id } = req.query;
    const params = [req.orgId];
    let query = `
      SELECT g.*,
         COUNT(DISTINCT gi.id) FILTER (WHERE gi.status = 'active') AS campaign_count
       FROM campaign_groups g
       LEFT JOIN campaign_group_items gi ON gi.group_id = g.id
       WHERE g.org_id = $1`;
    if (vertical_id) {
      params.push(vertical_id);
      query += ` AND EXISTS (
        SELECT 1 FROM campaign_group_items gi2
        JOIN campaigns gc ON gc.id = gi2.campaign_id
        WHERE gi2.group_id = g.id AND gc.vertical_id = $${params.length}
      )`;
    }
    query += ` GROUP BY g.id ORDER BY g.id DESC`;
    const result = await pool.query(query, params);
    const data = result.rows.map(r => ({ ...r, tracking_url: buildTrackingUrl(r.tracking_slug) }));
    res.json({ status: "SUCCESS", data });
  } catch (err) {
    console.error("GET CAMPAIGN GROUPS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load traffic groups" });
  }
});

router.post("/", orgAuth, async (req, res) => {
  try {
    const { name, geo, carrier } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ status: "FAILED", message: "Group name required" });

    let slug = generateSlug();
    for (let i = 0; i < 5; i++) {
      const exists = await pool.query(`SELECT id FROM campaign_groups WHERE tracking_slug = $1`, [slug]);
      if (!exists.rows.length) break;
      slug = generateSlug();
    }

    const result = await pool.query(
      `INSERT INTO campaign_groups (org_id, name, geo, carrier, tracking_slug, status)
       VALUES ($1,$2,$3,$4,$5,'active') RETURNING *`,
      [req.orgId, name.trim(), (geo || "").trim().toUpperCase(), (carrier || "").trim(), slug]
    );
    const row = result.rows[0];
    res.json({ status: "SUCCESS", data: { ...row, tracking_url: buildTrackingUrl(row.tracking_slug) } });
  } catch (err) {
    console.error("CREATE CAMPAIGN GROUP ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to create traffic group" });
  }
});

router.patch("/:id/status", orgAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "paused"].includes(status)) return res.status(400).json({ status: "FAILED", message: "Invalid status" });
    const result = await pool.query(
      `UPDATE campaign_groups SET status = $1 WHERE id = $2 AND org_id = $3 RETURNING *`,
      [status, req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Group not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE GROUP STATUS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update status" });
  }
});

// Campaigns inside a group, with their traffic-split weight
router.get("/:id/items", orgAuth, async (req, res) => {
  try {
    const groupCheck = await pool.query(`SELECT id FROM campaign_groups WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    if (!groupCheck.rows.length) return res.status(404).json({ status: "FAILED", message: "Group not found" });

    const result = await pool.query(
      `SELECT gi.*, c.name AS campaign_name, c.status AS campaign_status, c.payout, c.currency, a.name AS advertiser_name
       FROM campaign_group_items gi
       JOIN campaigns c ON c.id = gi.campaign_id
       JOIN advertisers a ON a.id = c.advertiser_id
       WHERE gi.group_id = $1 ORDER BY gi.id DESC`,
      [req.params.id]
    );
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET GROUP ITEMS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load group items" });
  }
});

router.post("/:id/items", orgAuth, async (req, res) => {
  try {
    const { campaign_id, weight } = req.body;
    if (!campaign_id) return res.status(400).json({ status: "FAILED", message: "campaign_id required" });
    const w = weight === undefined || weight === null || weight === "" ? 100 : Number(weight);
    if (isNaN(w) || w < 0 || w > 100) return res.status(400).json({ status: "FAILED", message: "weight must be 0-100" });

    const groupCheck = await pool.query(`SELECT id FROM campaign_groups WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    if (!groupCheck.rows.length) return res.status(404).json({ status: "FAILED", message: "Group not found" });
    const campCheck = await pool.query(`SELECT id FROM campaigns WHERE id = $1 AND org_id = $2`, [campaign_id, req.orgId]);
    if (!campCheck.rows.length) return res.status(400).json({ status: "FAILED", message: "Campaign not found" });

    const exists = await pool.query(`SELECT id FROM campaign_group_items WHERE group_id = $1 AND campaign_id = $2`, [req.params.id, campaign_id]);
    if (exists.rows.length) return res.status(400).json({ status: "FAILED", message: "This campaign is already in the group" });

    const result = await pool.query(
      `INSERT INTO campaign_group_items (group_id, campaign_id, weight, status) VALUES ($1,$2,$3,'active') RETURNING *`,
      [req.params.id, campaign_id, w]
    );
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("ADD GROUP ITEM ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to add campaign to group" });
  }
});

router.patch("/items/:itemId", orgAuth, async (req, res) => {
  try {
    const { weight, status } = req.body;
    if (weight !== undefined && (isNaN(Number(weight)) || Number(weight) < 0 || Number(weight) > 100)) {
      return res.status(400).json({ status: "FAILED", message: "weight must be 0-100" });
    }
    if (status !== undefined && !["active", "paused"].includes(status)) {
      return res.status(400).json({ status: "FAILED", message: "Invalid status" });
    }
    const result = await pool.query(
      `UPDATE campaign_group_items gi SET
        weight = COALESCE($1, gi.weight),
        status = COALESCE($2, gi.status)
       FROM campaign_groups g
       WHERE gi.id = $3 AND gi.group_id = g.id AND g.org_id = $4
       RETURNING gi.*`,
      [weight ?? null, status || null, req.params.itemId, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Item not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE GROUP ITEM ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update item" });
  }
});

router.delete("/items/:itemId", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM campaign_group_items gi USING campaign_groups g
       WHERE gi.id = $1 AND gi.group_id = g.id AND g.org_id = $2 RETURNING gi.id`,
      [req.params.itemId, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Item not found" });
    res.json({ status: "SUCCESS", message: "Removed from group" });
  } catch (err) {
    console.error("REMOVE GROUP ITEM ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to remove item" });
  }
});

export default router;
