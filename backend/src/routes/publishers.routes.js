import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* =====================================================
   🔐 GENERATE PUBLISHER API KEY
===================================================== */
function generatePublisherKey() {
  return "pub_" + crypto.randomBytes(16).toString("hex");
}

/* =====================================================
   📄 GET ALL PUBLISHERS
   GET /api/publishers
===================================================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        api_key,
        status,
        created_at
      FROM publishers
      ORDER BY id DESC
    `);

    return res.json({
      status: "SUCCESS",
      data: result.rows,
    });
  } catch (err) {
    console.error("GET PUBLISHERS ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to load publishers",
    });
  }
});

/* =====================================================
   ➕ ADD PUBLISHER
   POST /api/publishers
===================================================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        status: "FAILED",
        message: "Publisher name required",
      });
    }

    const apiKey = generatePublisherKey();

    const result = await pool.query(
      `
      INSERT INTO publishers (name, api_key, status)
      VALUES ($1, $2, 'active')
      RETURNING id, name, api_key, status, created_at
      `,
      [name, apiKey]
    );

    return res.json({
      status: "SUCCESS",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("ADD PUBLISHER ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to create publisher",
    });
  }
});

/* =====================================================
   🔄 UPDATE STATUS (ACTIVE / PAUSED)
   PATCH /api/publishers/:id/status
===================================================== */
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "paused"].includes(status)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid status",
      });
    }

    await pool.query(
      `
      UPDATE publishers
      SET status = $1
      WHERE id = $2
      `,
      [status, id]
    );

    return res.json({
      status: "SUCCESS",
      message: "Publisher status updated",
    });
  } catch (err) {
    console.error("UPDATE PUBLISHER STATUS ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to update publisher status",
    });
  }
});

export default router;
