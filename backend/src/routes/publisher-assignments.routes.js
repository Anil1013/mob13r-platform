import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

// GET /api/publisher-assignments?affiliate_id=&campaign_id=&group_id=&vertical_id=
router.get("/", orgAuth, async (req, res) => {
  try {
    const { affiliate_id, campaign_id, group_id, vertical_id } = req.query;
    let query = `
      SELECT pa.*, af.name AS affiliate_name,
        c.name AS campaign_name, c.payout AS advertiser_payout, c.currency, c.status AS campaign_status,
        g.name AS group_name, g.status AS group_status
      FROM publisher_assignments pa
      JOIN affiliates af ON af.id = pa.affiliate_id
      LEFT JOIN campaigns c ON c.id = pa.campaign_id
      LEFT JOIN campaign_groups g ON g.id = pa.group_id
      WHERE pa.org_id = $1`;
    const params = [req.orgId];
    if (affiliate_id) { params.push(affiliate_id); query += ` AND pa.affiliate_id = $${params.length}`; }
    if (campaign_id) { params.push(campaign_id); query += ` AND pa.campaign_id = $${params.length}`; }
    if (group_id) { params.push(group_id); query += ` AND pa.group_id = $${params.length}`; }
    if (vertical_id) {
      // Direct campaign assignments: match campaign's own vertical.
      // Group assignments: match if ANY campaign bundled in that group is in the vertical.
      params.push(vertical_id);
      query += ` AND (
        c.vertical_id = $${params.length}
        OR EXISTS (
          SELECT 1 FROM campaign_group_items gi
          JOIN campaigns gc ON gc.id = gi.campaign_id
          WHERE gi.group_id = pa.group_id AND gc.vertical_id = $${params.length}
        )
      )`;
    }
    query += ` ORDER BY pa.id DESC`;
    const result = await pool.query(query, params);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET PUBLISHER ASSIGNMENTS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load assignments" });
  }
});

// POST — assign a publisher to EITHER a single campaign OR a traffic group, with
// their own payout and an optional hold_percent (% of their conversions we
// intentionally don't forward to them).
router.post("/", orgAuth, async (req, res) => {
  try {
    const { affiliate_id, campaign_id, group_id, publisher_payout, hold_percent } = req.body;

    if (!affiliate_id) return res.status(400).json({ status: "FAILED", message: "affiliate_id is required" });
    if ((!campaign_id && !group_id) || (campaign_id && group_id)) {
      return res.status(400).json({ status: "FAILED", message: "Provide exactly one of campaign_id or group_id" });
    }
    if (publisher_payout === undefined || publisher_payout === null || publisher_payout === "" || isNaN(Number(publisher_payout)) || Number(publisher_payout) < 0) {
      return res.status(400).json({ status: "FAILED", message: "publisher_payout must be a positive number" });
    }
    const hold = hold_percent === undefined || hold_percent === null || hold_percent === "" ? 0 : Number(hold_percent);
    if (isNaN(hold) || hold < 0 || hold > 100) {
      return res.status(400).json({ status: "FAILED", message: "hold_percent must be between 0 and 100" });
    }

    const affCheck = await pool.query(`SELECT id FROM affiliates WHERE id = $1 AND org_id = $2`, [affiliate_id, req.orgId]);
    if (!affCheck.rows.length) return res.status(400).json({ status: "FAILED", message: "Publisher not found" });

    if (campaign_id) {
      const c = await pool.query(`SELECT payout FROM campaigns WHERE id = $1 AND org_id = $2`, [campaign_id, req.orgId]);
      if (!c.rows.length) return res.status(400).json({ status: "FAILED", message: "Campaign not found" });
      // Note: publisher_payout is allowed to exceed the advertiser's payout —
      // hold_percent (conversions intentionally not forwarded to the publisher)
      // is how margin is protected in that case, not a hard cap here.
    } else {
      const g = await pool.query(`SELECT id FROM campaign_groups WHERE id = $1 AND org_id = $2`, [group_id, req.orgId]);
      if (!g.rows.length) return res.status(400).json({ status: "FAILED", message: "Traffic group not found" });
    }

    const exists = await pool.query(
      `SELECT id FROM publisher_assignments WHERE affiliate_id = $1 AND campaign_id IS NOT DISTINCT FROM $2 AND group_id IS NOT DISTINCT FROM $3`,
      [affiliate_id, campaign_id || null, group_id || null]
    );
    if (exists.rows.length) return res.status(400).json({ status: "FAILED", message: "This publisher is already assigned here — edit the existing assignment instead" });

    const result = await pool.query(
      `INSERT INTO publisher_assignments (org_id, affiliate_id, campaign_id, group_id, publisher_payout, hold_percent, status)
       VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING *`,
      [req.orgId, affiliate_id, campaign_id || null, group_id || null, Number(publisher_payout), hold]
    );
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("CREATE PUBLISHER ASSIGNMENT ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to create assignment" });
  }
});

router.patch("/:id", orgAuth, async (req, res) => {
  try {
    const { publisher_payout, hold_percent, status } = req.body;
    if (publisher_payout !== undefined && publisher_payout !== null && (isNaN(Number(publisher_payout)) || Number(publisher_payout) < 0)) {
      return res.status(400).json({ status: "FAILED", message: "publisher_payout must be a positive number" });
    }
    if (hold_percent !== undefined && hold_percent !== null && (isNaN(Number(hold_percent)) || Number(hold_percent) < 0 || Number(hold_percent) > 100)) {
      return res.status(400).json({ status: "FAILED", message: "hold_percent must be between 0 and 100" });
    }
    if (status !== undefined && status !== null && !["active", "paused"].includes(status)) {
      return res.status(400).json({ status: "FAILED", message: "Invalid status" });
    }

    // Note: publisher_payout is allowed to exceed the advertiser's payout —
    // hold_percent is how margin is protected in that case, not a hard cap here.

    const result = await pool.query(
      `UPDATE publisher_assignments SET
        publisher_payout = COALESCE($1, publisher_payout),
        hold_percent = COALESCE($2, hold_percent),
        status = COALESCE($3, status)
       WHERE id = $4 AND org_id = $5 RETURNING *`,
      [publisher_payout ?? null, hold_percent ?? null, status || null, req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Assignment not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE PUBLISHER ASSIGNMENT ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update assignment" });
  }
});

router.delete("/:id", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM publisher_assignments WHERE id = $1 AND org_id = $2 RETURNING id`,
      [req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Assignment not found" });
    res.json({ status: "SUCCESS", message: "Assignment removed" });
  } catch (err) {
    console.error("DELETE PUBLISHER ASSIGNMENT ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to remove assignment" });
  }
});

export default router;
