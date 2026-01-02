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
===================================================== */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, api_key, status, created_at
      FROM publishers
      ORDER BY id DESC
    `);

    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET PUBLISHERS ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to load publishers",
    });
  }
});

/* =====================================================
   ➕ ADD PUBLISHER
===================================================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ status: "FAILED", message: "Publisher name required" });

    const apiKey = generatePublisherKey();

    const result = await pool.query(
      `
      INSERT INTO publishers (name, api_key, status)
      VALUES ($1,$2,'active')
      RETURNING *
      `,
      [name, apiKey]
    );

    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("ADD PUBLISHER ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to create publisher",
    });
  }
});

/* =====================================================
   🔄 UPDATE PUBLISHER STATUS
===================================================== */
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "paused"].includes(status))
      return res
        .status(400)
        .json({ status: "FAILED", message: "Invalid status" });

    await pool.query(
      `UPDATE publishers SET status=$1 WHERE id=$2`,
      [status, id]
    );

    res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("UPDATE PUBLISHER STATUS ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to update publisher status",
    });
  }
});

/* =====================================================
   📋 GET ASSIGNED OFFERS (frontend friendly)
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

        o.service_name AS name,
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

    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET ASSIGNED OFFERS ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to load assigned offers",
    });
  }
});

/* =====================================================
   ➕ ASSIGN OFFER
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

    if (!offer_id || !publisher_cpa)
      return res.status(400).json({
        status: "FAILED",
        message: "offer_id and publisher_cpa required",
      });

    if (pass_percent < 0 || pass_percent > 100)
      return res.status(400).json({
        status: "FAILED",
        message: "pass_percent must be between 0–100",
      });

    if (weight < 1)
      return res.status(400).json({
        status: "FAILED",
        message: "weight must be >= 1",
      });

    const exists = await pool.query(
      `
      SELECT id FROM publisher_offers
      WHERE publisher_id=$1 AND offer_id=$2
      `,
      [publisherId, offer_id]
    );

    if (exists.rows.length)
      return res.status(400).json({
        status: "FAILED",
        message: "Offer already assigned to publisher",
      });

    const insert = await pool.query(
      `
      INSERT INTO publisher_offers
      (publisher_id, offer_id, publisher_cpa, daily_cap, pass_percent, weight, status)
      VALUES ($1,$2,$3,$4,$5,$6,'active')
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

    res.json({ status: "SUCCESS", data: insert.rows[0] });
  } catch (err) {
    console.error("ASSIGN OFFER ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      message: "Offer assignment failed",
    });
  }
});

/* =====================================================
   ✏️ UPDATE ASSIGNED OFFER
   (status / CPA / cap / pass % / weight)
===================================================== */
router.patch("/:publisherId/offers/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      publisher_cpa,
      daily_cap,
      pass_percent,
      weight,
    } = req.body;

    /* status toggle */
    if (status && !["active", "paused"].includes(status)) {
      return res
        .status(400)
        .json({ status: "FAILED", message: "Invalid status" });
    }

    if (pass_percent !== undefined && (pass_percent < 0 || pass_percent > 100))
      return res.status(400).json({
        status: "FAILED",
        message: "pass_percent must be 0–100",
      });

    if (weight !== undefined && weight < 1)
      return res.status(400).json({
        status: "FAILED",
        message: "weight must be >= 1",
      });

    await pool.query(
      `
      UPDATE publisher_offers
      SET
        status = COALESCE($1, status),
        publisher_cpa = COALESCE($2, publisher_cpa),
        daily_cap = COALESCE($3, daily_cap),
        pass_percent = COALESCE($4, pass_percent),
        weight = COALESCE($5, weight)
      WHERE id = $6
      `,
      [
        status,
        publisher_cpa,
        daily_cap,
        pass_percent,
        weight,
        id,
      ]
    );

    res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("UPDATE ASSIGNED OFFER ERROR:", err);
    res.status(500).json({
      status: "FAILED",
      message: "Failed to update assigned offer",
    });
  }
});

export default router;
