import { Router } from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();

/* 🔐 JWT PROTECTION */
router.use(auth);

/* =====================================================
   GET ALL OFFERS (WITH ADVERTISER NAME)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        o.*,
        a.name AS advertiser_name
      FROM offers o
      JOIN advertisers a ON a.id = o.advertiser_id
      ORDER BY o.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET OFFERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch offers" });
  }
});

/* =====================================================
   CREATE OFFER
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
      api_mode,

      status_check_url,
      status_check_params = [],

      pin_send_url,
      pin_send_params = [],

      pin_verify_url,
      pin_verify_params = [],

      redirect_url,
      steps,
      is_active = true,

      fraud_enabled = false,
      fraud_partner,
      fraud_service,
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
        api_mode,

        status_check_url,
        status_check_params,

        pin_send_url,
        pin_send_params,

        pin_verify_url,
        pin_verify_params,

        redirect_url,
        steps,
        is_active,

        fraud_enabled,
        fraud_partner,
        fraud_service
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,
        $10,$11,
        $12,$13,
        $14,$15,$16,
        $17,$18,$19
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
        api_mode,

        status_check_url,
        status_check_params,

        pin_send_url,
        pin_send_params,

        pin_verify_url,
        pin_verify_params,

        redirect_url,
        steps,
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
   UPDATE OFFER (EDIT SUPPORT)
===================================================== */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      geo,
      carrier,
      payout,
      revenue,
      api_mode,

      status_check_url,
      status_check_params = [],

      pin_send_url,
      pin_send_params = [],

      pin_verify_url,
      pin_verify_params = [],

      redirect_url,
      steps,
      is_active,

      fraud_enabled = false,
      fraud_partner,
      fraud_service,
    } = req.body;

    const { rows } = await pool.query(
      `
      UPDATE offers
      SET
        name = $1,
        geo = $2,
        carrier = $3,
        payout = $4,
        revenue = $5,
        api_mode = $6,

        status_check_url = $7,
        status_check_params = $8,

        pin_send_url = $9,
        pin_send_params = $10,

        pin_verify_url = $11,
        pin_verify_params = $12,

        redirect_url = $13,
        steps = $14,
        is_active = $15,

        fraud_enabled = $16,
        fraud_partner = $17,
        fraud_service = $18,

        updated_at = NOW()
      WHERE id = $19
      RETURNING *
      `,
      [
        name,
        geo,
        carrier,
        payout,
        revenue,
        api_mode,

        status_check_url,
        status_check_params,

        pin_send_url,
        pin_send_params,

        pin_verify_url,
        pin_verify_params,

        redirect_url,
        steps,
        is_active,

        fraud_enabled,
        fraud_partner,
        fraud_service,
        id,
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
   TOGGLE OFFER STATUS (ACTIVE / INACTIVE)
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
    console.error("TOGGLE STATUS ERROR:", err);
    res.status(500).json({ message: "Failed to toggle status" });
  }
});

/* =====================================================
   DELETE OFFER
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM offers WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE OFFER ERROR:", err);
    res.status(500).json({ message: "Failed to delete offer" });
  }
});

export default router;
