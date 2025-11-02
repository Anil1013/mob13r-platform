import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import crypto from "crypto";

const router = express.Router();

// ✅ Admin Login (bcrypt + token)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const q = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = $1 LIMIT 1",
      [username]
    );

    if (q.rowCount === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = q.rows[0];

    // ✅ Allow only admin
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // ✅ JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ List API Keys
router.get("/apikey", async (req, res) => {
  try {
    const r = await pool.query("SELECT id, created_at FROM admin_keys ORDER BY id DESC");
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create API Key
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
