import express from "express";
import pool from "../../db.js";
import orgAuth from "../../middleware/orgAuth.js";

const router = express.Router();

router.get("/org", orgAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM organizations WHERE id = $1", [req.orgId]);
    if (!result.rows.length) return res.status(404).json({ error: "Org not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/org/usage", orgAuth, async (req, res) => {
  try {
    const org_id = req.orgId;
    const publishers = await pool.query("SELECT COUNT(*) FROM publishers WHERE org_id = $1", [org_id]);
    const offers = await pool.query("SELECT COUNT(*) FROM offers WHERE org_id = $1", [org_id]);
    const conversions = await pool.query(
      `SELECT COUNT(*) FROM pin_sessions
       WHERE org_id = $1
       AND status = 'VERIFIED'
       AND created_at >= date_trunc('month', NOW())`,
      [org_id]
    );
    const org = await pool.query("SELECT * FROM organizations WHERE id = $1", [org_id]);
    res.json({
      success: true,
      data: {
        publishers: { used: parseInt(publishers.rows[0].count), max: org.rows[0].max_publishers },
        offers: { used: parseInt(offers.rows[0].count), max: org.rows[0].max_offers },
        conversions: { used: parseInt(conversions.rows[0].count), max: org.rows[0].monthly_conversions },
        plan: org.rows[0].plan
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/org", orgAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      "UPDATE organizations SET name = $1 WHERE id = $2 RETURNING *",
      [name, req.orgId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
