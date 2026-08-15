import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

// GET /api/verticals?active_only=true  -> for sidebar (publisher/affiliate facing)
// GET /api/verticals                   -> full list for admin management screen
router.get("/", orgAuth, async (req, res) => {
  try {
    const { active_only } = req.query;
    let query = `SELECT v.*,
                   COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'active') AS active_campaigns
                 FROM verticals v
                 LEFT JOIN campaigns c ON c.vertical_id = v.id
                 WHERE v.org_id = $1`;
    if (active_only === "true") query += ` AND v.is_active = TRUE`;
    query += ` GROUP BY v.id ORDER BY v.display_order ASC, v.id ASC`;
    const result = await pool.query(query, [req.orgId]);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET VERTICALS ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to load verticals" });
  }
});

router.post("/", orgAuth, async (req, res) => {
  try {
    const { name, code, icon, display_order } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: "FAILED", message: "name is required" });
    }
    if (!code || !/^[A-Za-z0-9_-]{2,20}$/.test(code.trim())) {
      return res.status(400).json({ status: "FAILED", message: "code must be 2-20 letters/numbers (e.g. CPA, CPI2)" });
    }
    const result = await pool.query(
      `INSERT INTO verticals (org_id, name, code, icon, display_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (org_id, code) DO NOTHING RETURNING *`,
      [req.orgId, name.trim(), code.trim().toUpperCase(), icon || "📁", Number(display_order) || 0]
    );
    if (!result.rows.length) {
      return res.status(400).json({ status: "FAILED", message: "Vertical with this code already exists" });
    }
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("CREATE VERTICAL ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to create vertical" });
  }
});

// hide/unhide
router.patch("/:id/toggle", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE verticals SET is_active = NOT is_active
       WHERE id = $1 AND org_id = $2 RETURNING *`,
      [req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Vertical not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("TOGGLE VERTICAL ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to toggle vertical" });
  }
});

router.patch("/:id", orgAuth, async (req, res) => {
  try {
    const { name, icon, display_order } = req.body;
    const result = await pool.query(
      `UPDATE verticals SET
        name = COALESCE($1, name),
        icon = COALESCE($2, icon),
        display_order = COALESCE($3, display_order)
       WHERE id = $4 AND org_id = $5 RETURNING *`,
      [name || null, icon || null, display_order ?? null, req.params.id, req.orgId]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", message: "Vertical not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE VERTICAL ERROR:", err.message);
    res.status(500).json({ status: "FAILED", message: "Failed to update vertical" });
  }
});

export default router;
