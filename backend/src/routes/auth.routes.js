import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    // 1. Pehle users table mein check karo (SaaS users)
    try {
      const userResult = await pool.query(
        `SELECT u.*, o.name as org_name, o.plan, o.status as org_status
         FROM users u
         JOIN organizations o ON o.id = u.org_id
         WHERE u.email = $1 AND u.status = 'active'`,
        [email]
      );

      if (userResult.rows.length) {
        const user = userResult.rows[0];
        if (user.org_status !== "active") {
          return res.status(403).json({ success: false, message: "Organization suspended or pending" });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, org_id: user.org_id },
            process.env.JWT_SECRET || "mob13r_secret",
            { expiresIn: "24h" }
          );
          return res.json({
            success: true, token, expiresIn: 86400,
            user: { email: user.email, role: user.role },
            org: { id: user.org_id, name: user.org_name, plan: user.plan }
          });
        }
      }
    } catch (dbErr) {
      console.log("DB users check failed, trying hardcoded:", dbErr.message);
    }

    // 2. Fallback — hardcoded admin check
    const ADMIN_EMAIL = "admin@mob13r.com";
    const ADMIN_PASS = "Admin@123";

    if (email === ADMIN_EMAIL) {
      const isMatch = await bcrypt.compare(password, bcrypt.hashSync(ADMIN_PASS, 10)) ||
                      password === ADMIN_PASS;
      if (isMatch) {
        const token = jwt.sign(
          { id: 1, email: ADMIN_EMAIL, role: "admin", org_id: 1 },
          process.env.JWT_SECRET || "mob13r_secret",
          { expiresIn: "24h" }
        );
        return res.json({
          success: true, token, expiresIn: 86400,
          user: { email: ADMIN_EMAIL, role: "admin" },
          org: { id: 1, name: "Default Org", plan: "pro" }
        });
      }
    }

    return res.status(401).json({ success: false, message: "Invalid credentials" });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
