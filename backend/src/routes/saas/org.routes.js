import express from "express";
import pool from "../../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();

const getOrgId = (req) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mob13r_secret");
    return decoded.org_id || 1;
  } catch { return 1; }
};

router.get("/org", async (req, res) => {
  try {
    const org_id = getOrgId(req);
    const result = await pool.query("SELECT * FROM organizations WHERE id = $1", [org_id]);
    if (!result.rows.length) return res.status(404).json({ error: "Org not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/org/usage", async (req, res) => {
  try {
    const org_id = getOrgId(req);
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

router.patch("/org", async (req, res) => {
  try {
    const org_id = getOrgId(req);
    const { name } = req.body;
    const result = await pool.query(
      "UPDATE organizations SET name = $1 WHERE id = $2 RETURNING *",
      [name, org_id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
