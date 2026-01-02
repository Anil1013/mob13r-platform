import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

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
   🔄 UPDATE PUBLISHER STATUS
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

    return res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("UPDATE PUBLISHER STATUS ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to update publisher status",
    });
  }
});

/* =====================================================
   📋 GET ASSIGNED OFFERS FOR PUBLISHER
   GET /api/publishers/:publisherId/offers
   ✅ FIXED FOR service_name
===================================================== */
router.get("/:publisherId/offers", authMiddleware, async (req, res) => {
  try {
    const { publisherId } = req.params;

    const result = await pool.query(
      `
      SELECT
        po.id,
        po.publisher_id,
        po.offer_id,

        -- ✅ frontend-friendly name
        o.service_name AS name,

        o.service_name,
        o.geo,
        o.carrier,

        po.publisher_cpa,
        po.daily_cap,
        po.pass_percent,
        po.weight,
        po.status
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      WHERE po.publisher_id = $1
      ORDER BY po.id DESC
      `,
      [publisherId]
    );

    return res.json({
      status: "SUCCESS",
      data: result.rows,
    });
  } catch (err) {
    console.error("GET ASSIGNED OFFERS ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to load assigned offers",
    });
  }
});

/* =====================================================
   ➕ ASSIGN OFFER TO PUBLISHER
   POST /api/publishers/:publisherId/offers
===================================================== */
router.post("/:publisherId/offers", authMiddleware, async (req, res) => {
  try {
    const { publisherId } = req.params;
    const {
      offer_id,
      publisher_cpa,
      daily_cap,
      pass_percent = 100,
      weight = 100,
    } = req.body;

    if (!offer_id || !publisher_cpa) {
      return res.status(400).json({
        status: "FAILED",
        message: "offer_id and publisher_cpa required",
      });
    }

    /* ❌ prevent duplicate assignment */
    const exists = await pool.query(
      `
      SELECT id
      FROM publisher_offers
      WHERE publisher_id = $1
        AND offer_id = $2
      `,
      [publisherId, offer_id]
    );

    if (exists.rows.length) {
      return res.status(400).json({
        status: "FAILED",
        message: "Offer already assigned to publisher",
      });
    }

    const insert = await pool.query(
      `
      INSERT INTO publisher_offers
      (publisher_id, offer_id, publisher_cpa, daily_cap, pass_percent, weight, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING *
      `,
      [
        publisherId,
        offer_id,
        publisher_cpa,
        daily_cap || null,
        pass_percent,
        weight,
      ]
    );

    return res.json({
      status: "SUCCESS",
      data: insert.rows[0],
    });
  } catch (err) {
    console.error("ASSIGN OFFER ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Offer assignment failed",
    });
  }
});

/* =====================================================
   🔁 TOGGLE ASSIGNED OFFER STATUS
   PATCH /api/publishers/:publisherId/offers/:id
===================================================== */
router.patch("/:publisherId/offers/:id", authMiddleware, async (req, res) => {
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
      UPDATE publisher_offers
      SET status = $1
      WHERE id = $2
      `,
      [status, id]
    );

    return res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("UPDATE ASSIGNED OFFER STATUS ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to update offer status",
    });
  }
});

export default router;
