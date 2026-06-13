import express from "express";
import pool from "../../db.js";
import jwt from "jsonwebtoken";

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

// GET all orgs
router.get("/admin/orgs", isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, COUNT(u.id) as user_count
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

// PATCH org (plan, status, limits)
router.patch("/admin/orgs/:id", isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, status, max_publishers, max_offers, monthly_conversions } = req.body;
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

// FREE APPROVE - one click
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
      UPDATE organizations SET
        status = 'active',
        plan = $1,
        max_publishers = $2,
        max_offers = $3,
        monthly_conversions = $4
      WHERE id = $5 RETURNING *`,
      [plan, l.max_publishers, l.max_offers, l.monthly_conversions, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
