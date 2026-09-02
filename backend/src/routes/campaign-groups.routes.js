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
    const { vertical_id, affiliate_id } = req.query;
    const params = [req.orgId];
    let query = `
      SELECT g.*, af.name AS affiliate_name,
         COUNT(DISTINCT gi.id) FILTER (WHERE gi.status = 'active') AS campaign_count
       FROM campaign_groups g
       LEFT JOIN affiliates af ON af.id = g.affiliate_id
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
    if (affiliate_id) { params.push(affiliate_id); query += ` AND g.affiliate_id = $${params.length}`; }
    query += ` GROUP BY g.id, af.name ORDER BY g.id DESC`;
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
    const { name, geo, carrier, affiliate_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ status: "FAILED", message: "Group name required" });

    let affiliateId = null;
    if (affiliate_id) {
      const affCheck = await pool.query(`SELECT id FROM affiliates WHERE id = $1 AND org_id = $2`, [affiliate_id, req.orgId]);
      if (!affCheck.rows.length) return res.status(400).json({ status: "FAILED", message: "Publisher not found" });
      affiliateId = affiliate_id;
    }

    let slug = generateSlug();
    for (let i = 0; i < 5; i++) {
      const exists = await pool.query(`SELECT id FROM campaign_groups WHERE tracking_slug = $1`, [slug]);
      if (!exists.rows.length) break;
      slug = generateSlug();
    }

    const result = await pool.query(
      `INSERT INTO campaign_groups (org_id, name, geo, carrier, affiliate_id, tracking_slug, status)
       VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING *`,
      [req.orgId, name.trim(), (geo || "").trim().toUpperCase(), (carrier || "").trim(), affiliateId, slug]
    );
    const row = result.rows[0];
    res.json({ status: "SUCCESS", data: { ...row, tracking_url: buildTrackingUrl(row.tracking_slug) } });
  } catch (err) {
    if (err.code === "23505" && err.constraint === "idx_campaign_groups_unique_active_publisher_scoped") {
      return res.status(400).json({ status: "FAILED", message: "This publisher already has an active traffic group for this Geo/Carrier — pause or edit the existing one instead of creating a second one." });
    }
    if (err.code === "23505" && err.constraint === "idx_campaign_groups_unique_active_generic") {
      return res.status(400).json({ status: "FAILED", message: "An active generic (no specific publisher) traffic group already exists for this Geo/Carrier — pause or edit the existing one instead of creating a second one." });
    }
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
    if (err.code === "23505" && err.constraint === "idx_campaign_groups_unique_active_publisher_scoped") {
      return res.status(400).json({ status: "FAILED", message: "Can't reactivate — this publisher already has another active traffic group for this Geo/Carrier." });
    }
    if (err.code === "23505" && err.constraint === "idx_campaign_groups_unique_active_generic") {
      return res.status(400).json({ status: "FAILED", message: "Can't reactivate — another active generic traffic group already covers this Geo/Carrier." });
    }
    console.error("UPDATE GROUP STATUS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update status" });
  }
});

// Full edit — name, geo, carrier, and which publisher (if any) it's scoped
// to. Previously only status could be changed; a typo'd geo/carrier or a
// wrong publisher scope had no fix except abandoning the group entirely.
router.patch("/:id", orgAuth, async (req, res) => {
  try {
    const { name, geo, carrier, affiliate_id } = req.body;

    let affiliateId;
    if (affiliate_id !== undefined) {
      if (affiliate_id === null || affiliate_id === "") {
        affiliateId = null;
      } else {
        const affCheck = await pool.query(`SELECT id FROM affiliates WHERE id = $1 AND org_id = $2`, [affiliate_id, req.orgId]);
        if (!affCheck.rows.length) return res.status(400).json({ status: "FAILED", message: "Publisher not found" });
        affiliateId = affiliate_id;
      }
    }

    const result = await pool.query(
      `UPDATE campaign_groups SET
        name = COALESCE($1, name),
        geo = CASE WHEN $2::boolean THEN $3 ELSE geo END,
        carrier = CASE WHEN $4::boolean THEN $5 ELSE carrier END,
        affiliate_id = CASE WHEN $6::boolean THEN $7 ELSE affiliate_id END
       WHERE id = $8 AND org_id = $9 RETURNING *`,
      [
        name && name.trim() ? name.trim() : null,
        geo !== undefined, (geo || "").trim().toUpperCase(),
        carrier !== undefined, (carrier || "").trim(),
        affiliate_id !== undefined, affiliateId ?? null,
        req.params.id, req.orgId,
      ]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Group not found" });
    const row = result.rows[0];
    res.json({ status: "SUCCESS", data: { ...row, tracking_url: buildTrackingUrl(row.tracking_slug) } });
  } catch (err) {
    if (err.code === "23505" && err.constraint === "idx_campaign_groups_unique_active_publisher_scoped") {
      return res.status(400).json({ status: "FAILED", message: "This publisher already has another active traffic group for that Geo/Carrier." });
    }
    if (err.code === "23505" && err.constraint === "idx_campaign_groups_unique_active_generic") {
      return res.status(400).json({ status: "FAILED", message: "An active generic traffic group already exists for that Geo/Carrier." });
    }
    console.error("UPDATE CAMPAIGN GROUP ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update traffic group" });
  }
});

// Delete the whole group (and its items, via ON DELETE CASCADE). A group
// that's actively serving traffic can't be removed by accident — pause it
// first (this mirrors how campaigns/offers require pausing before other
// destructive actions elsewhere in the app).
router.delete("/:id", orgAuth, async (req, res) => {
  try {
    const g = await pool.query(`SELECT status FROM campaign_groups WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    if (!g.rows.length) return res.status(404).json({ status: "FAILED", message: "Group not found" });
    if (g.rows[0].status === "active") {
      return res.status(400).json({ status: "FAILED", message: "Pause this traffic group before deleting it." });
    }
    await pool.query(`DELETE FROM campaign_groups WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    res.json({ status: "SUCCESS", message: "Traffic group deleted" });
  } catch (err) {
    console.error("DELETE CAMPAIGN GROUP ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to delete traffic group" });
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

    const groupCheck = await pool.query(`SELECT id, geo, carrier FROM campaign_groups WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    if (!groupCheck.rows.length) return res.status(404).json({ status: "FAILED", message: "Group not found" });
    const group = groupCheck.rows[0];

    const campCheck = await pool.query(`SELECT id, geo, carrier FROM campaigns WHERE id = $1 AND org_id = $2`, [campaign_id, req.orgId]);
    if (!campCheck.rows.length) return res.status(400).json({ status: "FAILED", message: "Campaign not found" });
    const camp = campCheck.rows[0];

    // The resolver picks group members purely by weight, with no per-item
    // geo/carrier check — a mismatched campaign here would silently get
    // mixed into traffic meant for a different geo/carrier entirely.
    if (group.geo && camp.geo && group.geo !== camp.geo) {
      return res.status(400).json({ status: "FAILED", message: `This campaign's Geo (${camp.geo}) doesn't match the group's Geo (${group.geo}).` });
    }
    if (group.carrier && camp.carrier && group.carrier !== camp.carrier) {
      return res.status(400).json({ status: "FAILED", message: `This campaign's Carrier (${camp.carrier}) doesn't match the group's Carrier (${group.carrier}).` });
    }

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
