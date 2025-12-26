const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const db = require("../db");

/**
 * OFFERS ROUTES
 *
 * This file handles:
 * - Offer CRUD
 * - Status toggle
 *
 * NOTE:
 * - Execution APIs are handled in offer-execution.routes.js
 * - api_steps is stored as JSON
 */

/* =====================================================
   GET ALL OFFERS
===================================================== */
router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        o.*,
        a.name AS advertiser_name
      FROM offers o
      LEFT JOIN advertisers a ON a.id = o.advertiser_id
      ORDER BY o.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /offers error:", err);
    res.status(500).send("Failed to fetch offers");
  }
});

/* =====================================================
   GET OFFER BY ID (FULL CONFIG)
===================================================== */
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `
      SELECT
        o.*,
        a.name AS advertiser_name
      FROM offers o
      LEFT JOIN advertisers a ON a.id = o.advertiser_id
      WHERE o.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).send("Offer not found");
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /offers/:id error:", err);
    res.status(500).send("Failed to fetch offer");
  }
});

/* =====================================================
   CREATE OFFER
===================================================== */
router.post("/", auth, async (req, res) => {
  try {
    const {
      advertiser_id,
      name,
      geo,
      carrier,
      payout,
      revenue,
      daily_cap,
      redirect_url,
      fallback_offer_id,
      is_active,
      api_steps,
    } = req.body;

    if (!name) {
      return res.status(400).send("Offer name is required");
    }

    const { rows } = await db.query(
      `
      INSERT INTO offers (
        advertiser_id,
        name,
        geo,
        carrier,
        payout,
        revenue,
        daily_cap,
        redirect_url,
        fallback_offer_id,
        is_active,
        api_steps
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        advertiser_id || null,
        name,
        geo || null,
        carrier || null,
        payout || 0,
        revenue || 0,
        daily_cap || 0,
        redirect_url || null,
        fallback_offer_id || null,
        is_active !== false,
        api_steps || {},
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("POST /offers error:", err);
    res.status(500).send("Failed to create offer");
  }
});

/* =====================================================
   UPDATE OFFER
===================================================== */
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      advertiser_id,
      name,
      geo,
      carrier,
      payout,
      revenue,
      daily_cap,
      redirect_url,
      fallback_offer_id,
      is_active,
      api_steps,
    } = req.body;

    const { rowCount, rows } = await db.query(
      `
      UPDATE offers SET
        advertiser_id = $1,
        name = $2,
        geo = $3,
        carrier = $4,
        payout = $5,
        revenue = $6,
        daily_cap = $7,
        redirect_url = $8,
        fallback_offer_id = $9,
        is_active = $10,
        api_steps = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
      `,
      [
        advertiser_id || null,
        name,
        geo || null,
        carrier || null,
        payout || 0,
        revenue || 0,
        daily_cap || 0,
        redirect_url || null,
        fallback_offer_id || null,
        is_active !== false,
        api_steps || {},
        id,
      ]
    );

    if (rowCount === 0) {
      return res.status(404).send("Offer not found");
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /offers/:id error:", err);
    res.status(500).send("Failed to update offer");
  }
});

/* =====================================================
   TOGGLE OFFER STATUS
===================================================== */
router.patch("/:id/status", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `
      UPDATE offers
      SET is_active = NOT is_active,
          updated_at = NOW()
      WHERE id = $1
      RETURNING is_active
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).send("Offer not found");
    }

    res.json({ is_active: rows[0].is_active });
  } catch (err) {
    console.error("PATCH /offers/:id/status error:", err);
    res.status(500).send("Failed to toggle status");
  }
});

/* =====================================================
   DELETE OFFER
===================================================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await db.query(
      `DELETE FROM offers WHERE id = $1`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).send("Offer not found");
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /offers/:id error:", err);
    res.status(500).send("Failed to delete offer");
  }
});



export default router;
