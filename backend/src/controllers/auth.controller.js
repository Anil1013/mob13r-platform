import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 🔎 Fetch admin
    const result = await pool.query(
      `SELECT id, email, password_hash, role
       FROM admins
       WHERE email = $1`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      console.error("❌ Invalid email:", cleanEmail);
      return res.status(400).json({ error: "Invalid email" });
    }

    const admin = result.rows[0];

    // 🔥 CRITICAL FIX #1: password_hash guard
    if (!admin.password_hash) {
      console.error("❌ password_hash missing for admin:", admin);
      return res
        .status(500)
        .json({ error: "Password not set for admin" });
    }

    console.log("🔐 Stored hash:", admin.password_hash);

    // 🔐 Compare password
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // 🔥 CRITICAL FIX #2: JWT_SECRET guard
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing in environment");
      return res
        .status(500)
        .json({ error: "JWT secret not configured" });
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("🔥 LOGIN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
