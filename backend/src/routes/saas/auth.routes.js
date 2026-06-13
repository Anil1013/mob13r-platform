import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../../db.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { company_name, email, password } = req.body;
    if (!company_name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields required" });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password min 6 characters" });
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length)
      return res.status(400).json({ success: false, message: "Email already registered" });
    const slug = company_name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();
    const orgResult = await pool.query(
      `INSERT INTO organizations (name, slug, plan, status, max_publishers, max_offers, monthly_conversions)
       VALUES ($1, $2, 'starter', 'active', 5, 10, 1000) RETURNING *`,
      [company_name, slug]
    );
    const org = orgResult.rows[0];
    const password_hash = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      `INSERT INTO users (org_id, email, password_hash, role) VALUES ($1, $2, $3, 'owner') RETURNING *`,
      [org.id, email, password_hash]
    );
    const user = userResult.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, org_id: org.id },
      process.env.JWT_SECRET || "mob13r_secret",
      { expiresIn: "24h" }
    );
    return res.json({ success: true, token, expiresIn: 86400,
      user: { email: user.email, role: user.role },
      org: { id: org.id, name: org.name, plan: org.plan }
    });
  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });
    const userResult = await pool.query(
      `SELECT u.*, o.name as org_name, o.plan, o.status as org_status
       FROM users u JOIN organizations o ON o.id = u.org_id
       WHERE u.email = $1 AND u.status = 'active'`,
      [email]
    );
    if (!userResult.rows.length)
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    const user = userResult.rows[0];
    if (user.org_status !== "active")
      return res.status(403).json({ success: false, message: "Organization suspended" });
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, org_id: user.org_id },
      process.env.JWT_SECRET || "mob13r_secret",
      { expiresIn: "24h" }
    );
    return res.json({ success: true, token, expiresIn: 86400,
      user: { email: user.email, role: user.role },
      org: { id: user.org_id, name: user.org_name, plan: user.plan }
    });
  } catch (err) {
    console.error("SAAS LOGIN ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mob13r_secret");
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, o.id as org_id, o.name as org_name,
              o.plan, o.max_publishers, o.max_offers, o.monthly_conversions
       FROM users u JOIN organizations o ON o.id = u.org_id WHERE u.id = $1`,
      [decoded.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, data: result.rows[0] });
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
