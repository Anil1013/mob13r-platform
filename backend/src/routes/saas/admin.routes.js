import express from "express";
import pool from "../../db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = express.Router();

const isSuperAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mob13r_secret");
    if (decoded.role !== "admin" && decoded.role !== "owner") {
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
        (SELECT COUNT(*) FROM pin_sessions WHERE org_id = o.id AND status IN ('VERIFIED','SCRUBBED','CAP_REACHED') AND parent_session_token IS NOT NULL) as total_conversions
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

    const result = await pool.query(`
      UPDATE organizations SET
        plan = COALESCE($1, plan),
        status = COALESCE($2, status),
        max_publishers = COALESCE($3, max_publishers),
        max_offers = COALESCE($4, max_offers),
        monthly_conversions = COALESCE($5, monthly_conversions)
      WHERE id = $6 RETURNING *`,
      [plan, status, max_publishers, max_offers, monthly_conversions, id]
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
