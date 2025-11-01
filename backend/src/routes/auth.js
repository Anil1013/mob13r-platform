import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

// ✅ Login API
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const q = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username = $1 LIMIT 1",
      [username]
    );

    if (q.rowCount === 0)
      return res.status(401).json({ error: "Invalid username or password" });

    const user = q.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
