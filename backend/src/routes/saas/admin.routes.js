import express from "express";
import pool from "../../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = express.Router();

const SUPER_ADMIN_EMAIL = "admin@mob13r.com";

const isSuperAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mob13r_secret");
    // IMPORTANT: this must NOT accept role === "owner" — every org's own
    // signup user gets role='owner' (see saas/auth.routes.js), so that
    // check previously let ANY customer call these endpoints directly
    // and view/edit/delete every other organization's data.
    if (decoded.email !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Super admin only" });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET all orgs with users
router.get("/admin/orgs", isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*,
        COUNT(DISTINCT u.id) as user_count,
        json_agg(json_build_object(
          'id', u.id,
          'email', u.email,
          'role', u.role,
          'status', u.status,
          'created_at', u.created_at
        )) as users,
        (SELECT COUNT(*) FROM advertisers WHERE org_id = o.id) as total_advertisers,
        (SELECT COUNT(*) FROM publishers WHERE org_id = o.id) as total_publishers,
        (SELECT COUNT(*) FROM offers WHERE org_id = o.id) as total_offers,
        (SELECT COUNT(*) FROM pin_sessions WHERE org_id = o.id) as total_sessions,
        (SELECT COUNT(*) FROM pin_sessions WHERE org_id = o.id AND status IN ('VERIFIED','SCRUBBED','CAP_REACHED') AND parent_session_token IS NOT NULL) as total_conversions,
        (SELECT COALESCE(json_agg(json_build_object('code', v.code, 'tier', v.tier) ORDER BY v.code), '[]') FROM verticals v WHERE v.org_id = o.id AND v.is_active = TRUE) as active_verticals,
        (SELECT COUNT(*) FROM campaigns WHERE org_id = o.id) as total_cpa_campaigns,
        (SELECT COUNT(*) FROM conversions WHERE org_id = o.id) as total_cpa_conversions
      FROM organizations o
      LEFT JOIN users u ON u.org_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pending plan/module change requests (from the Plans page)
router.get("/admin/plan-requests", isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, o.name AS org_name
      FROM plan_requests pr
      JOIN organizations o ON o.id = pr.org_id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a plan request — actually applies it: sets each CPA-suite vertical's
// tier (creating the vertical row if it wasn't active before) and/or MVAS tier,
// and deactivates/removes any module the org had before that ISN'T in this request.
router.post("/admin/plan-requests/:id/approve", isSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const reqRes = await client.query(`SELECT * FROM plan_requests WHERE id = $1 AND status = 'pending'`, [id]);
    if (!reqRes.rows.length) return res.status(404).json({ success: false, error: "Request not found or already resolved" });
    const request = reqRes.rows[0];
    const orgId = request.org_id;
    const tiered = request.requested_modules_tiered || request.requested_modules.map(c => ({ code: c, tier: "basic" }));

    await client.query("BEGIN");

    const cpaCodes = tiered.filter(m => m.code !== "MVAS");
    const mvasEntry = tiered.find(m => m.code === "MVAS");

    // Turn off any CPA-suite vertical not in the new request
    await client.query(
      `UPDATE verticals SET is_active = FALSE WHERE org_id = $1 AND code NOT IN (${cpaCodes.length ? cpaCodes.map((_, i) => `$${i + 2}`).join(",") : "''"})`,
      [orgId, ...cpaCodes.map(m => m.code)]
    );
    const META = { CPA: { name: "CPA", icon: "💰" }, CPI: { name: "CPI", icon: "📲" }, CPS: { name: "CPS", icon: "🛒" }, DCB: { name: "DCB", icon: "📶" } };
    for (const m of cpaCodes) {
      const meta = META[m.code];
      if (!meta) continue;
      await client.query(
        `INSERT INTO verticals (org_id, name, code, icon, is_active, tier)
         VALUES ($1,$2,$3,$4,TRUE,$5)
         ON CONFLICT (org_id, code) DO UPDATE SET is_active = TRUE, tier = EXCLUDED.tier`,
        [orgId, meta.name, m.code, meta.icon, m.tier]
      );
    }
    await client.query(
      `UPDATE organizations SET mvas_enabled = $1, mvas_tier = $2 WHERE id = $3`,
      [!!mvasEntry, mvasEntry?.tier || "basic", orgId]
    );
    await client.query(`UPDATE plan_requests SET status = 'approved', resolved_at = NOW() WHERE id = $1`, [id]);

    await client.query("COMMIT");
    res.json({ success: true, message: "Plan request approved and applied" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

router.post("/admin/plan-requests/:id/reject", isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE plan_requests SET status = 'rejected', resolved_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: "Request not found or already resolved" });
    res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH org
router.patch("/admin/orgs/:id", isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let { plan, status, max_publishers, max_offers, monthly_conversions } = req.body;

    // Auto-apply plan limits when plan changes
    const planLimits = {
      starter: { max_publishers: 5, max_offers: 15, monthly_conversions: 2500 },
      growth:  { max_publishers: 25, max_offers: 50, monthly_conversions: 7500 },
      pro:     { max_publishers: 999, max_offers: 999, monthly_conversions: 999999 },
    };
    if (plan && planLimits[plan]) {
      max_publishers = planLimits[plan].max_publishers;
      max_offers = planLimits[plan].max_offers;
      monthly_conversions = planLimits[plan].monthly_conversions;
    }

    // IMPORTANT: orgAuth auto-flips an org back to 'pending' if its
    // 30-day cycle (measured from plan_started_at) has elapsed OR its
    // conversion limit is crossed — this runs on every write request.
    // Without resetting plan_started_at here, manually setting
    // status='active' (via this dropdown or the Approve button) would
    // stick for exactly zero requests: the very next write would
    // recalculate cycleExpired from the still-old plan_started_at and
    // silently flip it right back to pending before the request could
    // even complete.
    const resetCycle = status === "active";

    const result = await pool.query(`
      UPDATE organizations SET
        plan = COALESCE($1, plan),
        status = COALESCE($2, status),
        max_publishers = COALESCE($3, max_publishers),
        max_offers = COALESCE($4, max_offers),
        monthly_conversions = COALESCE($5, monthly_conversions),
        plan_started_at = CASE WHEN $7 THEN NOW() ELSE plan_started_at END,
        notified_5day = CASE WHEN $7 THEN FALSE ELSE notified_5day END,
        notified_2day = CASE WHEN $7 THEN FALSE ELSE notified_2day END
      WHERE id = $6 RETURNING *`,
      [plan, status, max_publishers, max_offers, monthly_conversions, id, resetCycle]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESET PASSWORD
router.patch("/admin/users/:userId/reset-password", isSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: "Password min 6 characters" });
    }
    const password_hash = await bcrypt.hash(new_password, 10);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [password_hash, userId]
    );
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE org
router.delete("/admin/orgs/:id", isSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    if (Number(id) === 1) {
      return res.status(400).json({ success: false, error: "Cannot delete default organization" });
    }
    await client.query("BEGIN");
    // CPA module data (added later — org_id FKs here have no ON DELETE CASCADE,
    // so without this the whole DELETE would fail with a foreign-key violation
    // and roll back for any org that has ANY campaigns/verticals/etc).
    await client.query(`DELETE FROM conversions WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM clicks WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM publisher_assignments WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM campaign_group_items WHERE group_id IN (SELECT id FROM campaign_groups WHERE org_id = $1)`, [id]);
    await client.query(`DELETE FROM campaign_groups WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM affiliate_postbacks WHERE affiliate_id IN (SELECT id FROM affiliates WHERE org_id = $1)`, [id]);
    await client.query(`DELETE FROM campaigns WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM affiliates WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM verticals WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM plan_requests WHERE org_id = $1`, [id]);
    // Original In-app module data
    await client.query(`DELETE FROM pin_sessions WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM offer_parameters WHERE offer_id IN (SELECT id FROM offers WHERE org_id = $1)`, [id]);
    await client.query(`DELETE FROM publisher_offers WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM landing_pages WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM offers WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM publishers WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM advertisers WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM users WHERE org_id = $1`, [id]);
    await client.query(`DELETE FROM organizations WHERE id = $1`, [id]);
    await client.query("COMMIT");
    res.json({ success: true, message: "Organization deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// FREE APPROVE
router.post("/admin/orgs/:id/approve", isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan = "pro" } = req.body;
    const limits = {
      starter: { max_publishers:5, max_offers:15, monthly_conversions:2500 },
      growth:  { max_publishers:25, max_offers:50, monthly_conversions:7500 },
      pro:     { max_publishers:999, max_offers:999, monthly_conversions:30000 },
    };
    const l = limits[plan] || limits.pro;
    const result = await pool.query(`
      UPDATE organizations SET status='active', plan=$1,
        max_publishers=$2, max_offers=$3, monthly_conversions=$4,
        plan_started_at=NOW(), notified_5day=FALSE, notified_2day=FALSE
      WHERE id=$5 RETURNING *`,
      [plan, l.max_publishers, l.max_offers, l.monthly_conversions, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
