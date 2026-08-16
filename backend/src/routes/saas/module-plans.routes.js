import express from "express";
import pool from "../../db.js";
import orgAuth from "../../middleware/orgAuth.js";

const router = express.Router();
const TIER_ORDER = { basic: 0, growth: 1, pro: 2 };

// PUBLIC — full pricing matrix (every module × every tier), used by Signup and Plans
router.get("/module-plans", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM module_plans ORDER BY display_order ASC, tier ASC`);
    const data = result.rows.sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9));
    res.json({ success: true, data });
  } catch (err) {
    console.error("GET MODULE PLANS ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to load plans" });
  }
});

// Which modules is MY org currently on, at what tier, and what does that cost?
router.get("/my-modules", orgAuth, async (req, res) => {
  try {
    const orgRes = await pool.query(`SELECT mvas_enabled, mvas_tier FROM organizations WHERE id = $1`, [req.orgId]);
    const org = orgRes.rows[0] || {};
    const mvasEnabled = org.mvas_enabled !== false;
    const verticalsRes = await pool.query(`SELECT code, tier FROM verticals WHERE org_id = $1 AND is_active = TRUE`, [req.orgId]);
    const active = verticalsRes.rows.map(r => ({ code: r.code, tier: r.tier || "basic" }));
    if (mvasEnabled) active.push({ code: "MVAS", tier: org.mvas_tier || "basic" });

    let modules = [];
    let totalPrice = 0;
    for (const a of active) {
      const planRes = await pool.query(`SELECT * FROM module_plans WHERE code = $1 AND tier = $2`, [a.code, a.tier]);
      if (planRes.rows.length) {
        modules.push(planRes.rows[0]);
        totalPrice += Number(planRes.rows[0].price_monthly);
      }
    }

    res.json({ success: true, data: { active, modules, total_price: totalPrice } });
  } catch (err) {
    console.error("GET MY MODULES ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to load your modules" });
  }
});

// Request a change in modules/tiers (admin reviews & applies manually — no auto-billing yet)
router.post("/plan-request", orgAuth, async (req, res) => {
  try {
    const { modules } = req.body; // e.g. [{code:"CPA",tier:"growth"}, {code:"MVAS",tier:"basic"}]
    if (!Array.isArray(modules) || !modules.length) {
      return res.status(400).json({ success: false, message: "Select at least one module" });
    }
    let totalPrice = 0;
    const validated = [];
    for (const m of modules) {
      if (!m?.code || !m?.tier) continue;
      const planRes = await pool.query(`SELECT * FROM module_plans WHERE code = $1 AND tier = $2`, [m.code, m.tier]);
      if (!planRes.rows.length) continue;
      totalPrice += Number(planRes.rows[0].price_monthly);
      validated.push({ code: m.code, tier: m.tier });
    }
    if (!validated.length) return res.status(400).json({ success: false, message: "No valid modules selected" });

    const result = await pool.query(
      `INSERT INTO plan_requests (org_id, requested_by, requested_modules, requested_modules_tiered, total_price, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [req.orgId, req.user?.email || null, validated.map(v => v.code), JSON.stringify(validated), totalPrice]
    );
    res.json({ success: true, message: "Request sent — admin will review and activate it shortly", data: result.rows[0] });
  } catch (err) {
    console.error("PLAN REQUEST ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to submit request" });
  }
});

export default router;
