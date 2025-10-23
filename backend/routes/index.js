import express from "express";
import { pool } from "../server.js";

const router = express.Router();

// Root API route
router.get("/", (req, res) => {
  res.json({
    status: "✅ Mob13r API working",
    version: "v2.0",
    message: "Publisher & Advertiser API is live",
  });
});

// List all advertisers
router.get("/advertisers", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM advertisers ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all publishers
router.get("/publishers", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM publishers ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
