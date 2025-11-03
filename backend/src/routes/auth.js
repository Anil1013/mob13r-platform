import express from "express";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import bcrypt from "bcryptjs";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "mob13r_secret";

// ✅ Admin Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await pool.query(
      "SELECT * FROM admins WHERE email=$1 LIMIT 1",
      [email]
    );

    if (admin.rows.length === 0)
      return res.status(400).json({ error: "Invalid email" });

    const valid = await bcrypt.compare(password, admin.rows[0].password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    // ✅ Generate Token
    const token = jwt.sign(
      { id: admin.rows[0].id, role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login success",
      token,
      admin: {
        id: admin.rows[0].id,
        email: admin.rows[0].email,
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
