import express from "express";
import { pool } from "../server.js";

const router = express.Router();

// ✅ Root API route
router.get("/", (req, res) => {
  res.json({
    status: "API working 🚀",
    message: "Welcome to Mob13r backend",
  });
});

// ✅ DB connection test route
router.get("/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "✅ DB connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("❌ DB connection failed:", error.message);
    res.status(500).json({
      status: "❌ DB connection failed",
      error: error.message,
    });
  }
});

export default router;

