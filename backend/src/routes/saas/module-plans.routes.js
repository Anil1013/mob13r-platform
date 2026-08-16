import express from "express";
import pool from "../../db.js";
import orgAuth from "../../middleware/orgAuth.js";

const router = express.Router();

// PUBLIC — pricing list, used by both Signup (before login) and Plans page
router.get("/module-plans", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM module_plans ORDER BY display_order ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("GET MODULE PLANS ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to load plans" });
  }
});

// Which modules is MY org currently on, and what does that cost?
router.get("/my-modules", orgAuth, async (req, res) => {
  try {
    const orgRes = await pool.query(`SELECT mvas_enabled FROM organizations WHERE id = $1`, [req.orgId]);
    const mvasEnabled = orgRes.rows[0]?.mvas_enabled !== false;
    const verticalsRes = await pool.query(`SELECT code FROM verticals WHERE org_id = $1 AND is_active = TRUE`, [req.orgId]);
    const activeCodes = verticalsRes.rows.map(r => r.code);
    if (mvasEnabled) activeCodes.push("MVAS");

    const plansRes = await pool.query(`SELECT * FROM module_plans WHERE code = ANY($1)`, [activeCodes]);
    const totalPrice = plansRes.rows.reduce((sum, p) => sum + Number(p.price_monthly), 0);

    res.json({ success: true, data: { active_codes: activeCodes, modules: plansRes.rows, total_price: totalPrice } });
  } catch (err) {
    console.error("GET MY MODULES ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to load your modules" });
  }
});

// Request a change in modules (admin reviews & applies manually — no auto-billing yet)
router.post("/plan-request", orgAuth, async (req, res) => {
  try {
    const { modules } = req.body; // e.g. ["CPA","CPI","MVAS"]
    if (!Array.isArray(modules) || !modules.length) {
      return res.status(400).json({ success: false, message: "Select at least one module" });
    }
    const plansRes = await pool.query(`SELECT * FROM module_plans WHERE code = ANY($1)`, [modules]);
    const totalPrice = plansRes.rows.reduce((sum, p) => sum + Number(p.price_monthly), 0);

    const result = await pool.query(
      `INSERT INTO plan_requests (org_id, requested_by, requested_modules, total_price, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [req.orgId, req.user?.email || null, modules, totalPrice]
    );
    res.json({ success: true, message: "Request sent — admin will review and activate it shortly", data: result.rows[0] });
  } catch (err) {
    console.error("PLAN REQUEST ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to submit request" });
  }
});

export default router;
