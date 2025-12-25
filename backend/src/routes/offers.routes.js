import { Router } from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();

/* 🔐 PROTECT */
router.use(auth);

/* =====================================================
   GET ALL OFFERS
===================================================== */
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, a.name AS advertiser_name
      FROM offers o
      JOIN advertisers a ON a.id = o.advertiser_id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch offers" });
  }
});

/* =====================================================
   CREATE OFFER (ADVANCED)
===================================================== */
router.post("/", async (req, res) => {
  try {
    const {
      advertiser_id,
      name,
      geo,
      carrier,
      payout,
      revenue,
      cap,
      api_mode = "POST",

      api_steps,          // 🔥 FULL JSON TEMPLATE ENGINE
      redirect_url,

      is_active = true,

      fraud_enabled = false,
      fraud_partner = null,
      fraud_service = null,
    } = req.body;

    const { rows } = await pool.query(
      `
      INSERT INTO offers (
        advertiser_id,
        name,
        geo,
        carrier,
        payout,
        revenue,
        cap,
        api_mode,
        api_steps,
        redirect_url,
        is_active,
        fraud_enabled,
        fraud_partner,
        fraud_service
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )
      RETURNING *
      `,
      [
        advertiser_id,
        name,
        geo,
        carrier,
        payout,
        revenue,
        cap,
        api_mode,
        api_steps || {},
        redirect_url || null,
        is_active,
        fraud_enabled,
        fraud_partner,
        fraud_service,
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("CREATE OFFER ERROR:", err);
    res.status(500).json({ message: "Failed to create offer" });
  }
});

/* =====================================================
   UPDATE OFFER (ADVANCED)
===================================================== */
router.put("/:id", async (req, res) => {
  try {
    const {
      advertiser_id,
      name,
      geo,
      carrier,
      payout,
      revenue,
      cap,
      api_mode = "POST",

      api_steps,
      redirect_url,

      is_active,

      fraud_enabled = false,
      fraud_partner = null,
      fraud_service = null,
    } = req.body;

    const { rows } = await pool.query(
      `
      UPDATE offers SET
        advertiser_id = $1,
        name = $2,
        geo = $3,
        carrier = $4,
        payout = $5,
        revenue = $6,
        cap = $7,
        api_mode = $8,
        api_steps = $9,
        redirect_url = $10,
        is_active = $11,
        fraud_enabled = $12,
        fraud_partner = $13,
        fraud_service = $14,
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
      `,
      [
        advertiser_id,
        name,
        geo,
        carrier,
        payout,
        revenue,
        cap,
        api_mode,
        api_steps || {},
        redirect_url || null,
        is_active,
        fraud_enabled,
        fraud_partner,
        fraud_service,
        req.params.id,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE OFFER ERROR:", err);
    res.status(500).json({ message: "Failed to update offer" });
  }
});

/* =====================================================
   TOGGLE STATUS
===================================================== */
router.patch("/:id/status", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      UPDATE offers
      SET is_active = NOT is_active,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Toggle failed" });
  }
});

/* =====================================================
   DELETE OFFER
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM offers WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;
