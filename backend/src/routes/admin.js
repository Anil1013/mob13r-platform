import express from "express";
import pool from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// ✅ Admin Login (username/password → token)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1 AND password_hash = crypt($2, password_hash)",
      [username, password]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: result.rows[0].id, role: result.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ✅ List admin API Keys (optional — old logic kept)
router.get("/apikey", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM admin_keys ORDER BY id DESC;");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Generate API Key (optional)
router.post("/apikey", async (req, res) => {
  try {
    const newKey = crypto.randomBytes(24).toString("hex");
    await pool.query("INSERT INTO admin_keys (api_key) VALUES ($1);", [newKey]);
    res.json({ api_key: newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete API Key (optional)
router.delete("/apikey/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM admin_keys WHERE id = $1;", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
