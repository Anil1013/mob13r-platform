// backend/routes/clicks.js
import express from "express";
import pool from "../db/db.js";

const router = express.Router();

// 📍 GET all click logs
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM click_logs ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching click logs:", error);
    res.status(500).json({ error: "Failed to fetch click logs" });
  }
});

// 📍 POST - New click log
router.post("/", async (req, res) => {
  const {
    offer_id,
    publisher_id,
    advertiser_id,
    click_id,
    ip_address,
    user_agent,
    status,
    revenue,
  } = req.body;

  try {
    const query = `
      INSERT INTO click_logs
      (offer_id, publisher_id, advertiser_id, click_id, ip_address, user_agent, status, revenue)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      offer_id,
      publisher_id,
      advertiser_id,
      click_id,
      ip_address,
      user_agent,
      status || "clicked",
      revenue || 0,
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ message: "✅ Click log added", data: result.rows[0] });
  } catch (error) {
    console.error("❌ Error inserting click log:", error);
    res.status(500).json({ error: "Failed to insert click log" });
  }
});

export default router;
