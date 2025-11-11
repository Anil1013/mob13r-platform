import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import bcrypt from "bcryptjs";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "mob13r_secret";

// ✅ Admin Login Route (Improved)
router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Trim and normalize inputs
    email = email.trim().toLowerCase();
    password = password.trim();

    // Check for admin in DB
    const admin = await pool.query(
      "SELECT * FROM admins WHERE LOWER(email)=$1 LIMIT 1",
      [email]
    );

    if (admin.rows.length === 0) {
      console.log("❌ Invalid email:", email);
      return res.status(400).json({ error: "Invalid email" });
    }

    // Debugging (optional, remove later)
    console.log("🔍 Checking password for:", email);
    console.log("Stored hash:", admin.rows[0].password);

    // Validate bcrypt password
    const valid = await bcrypt.compare(password, admin.rows[0].password);

    if (!valid) {
      console.log("❌ Invalid password for:", email);
      return res.status(400).json({ error: "Invalid password" });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: admin.rows[0].id, role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Login success for:", email);

    res.json({
      message: "Login success",
      token,
      admin: {
        id: admin.rows[0].id,
        email: admin.rows[0].email,
      },
    });

  } catch (err) {
    console.error("⚠️ Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
