import express from "express";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = express.Router();

// ✅ Admin Login (POST /api/admin/login)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const q = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username=$1 AND role='admin'",
      [username]
    );

    if (q.rowCount === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = q.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ View Admin API Keys
router.get("/apikey", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM admin_keys ORDER BY id DESC;");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Generate New API Key
router.post("/apikey", async (req, res) => {
  try {
    const newKey = crypto.randomBytes(24).toString("hex");
    await pool.query("INSERT INTO admin_keys (api_key) VALUES ($1)", [newKey]);
    res.json({ api_key: newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete API Key
router.delete("/apikey/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM admin_keys WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
