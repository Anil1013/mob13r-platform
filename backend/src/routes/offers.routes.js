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
      apiMode,

      pinSendUrl,
      pinSendParams,

      pinVerifyUrl,
      pinVerifyParams,

      statusCheckUrl,

      fraudEnabled,
      fraudPartner,
      fraudService,
    } = req.body;

    const { rows } = await pool.query(
      `
      INSERT INTO offers (
        advertiser_id,
        name, geo, carrier,
        payout, revenue,
        api_mode,

        pin_send_url,
        pin_send_params,

        pin_verify_url,
        pin_verify_params,

        status_check_url,

        fraud_enabled,
        fraud_partner,
        fraud_service
      )
      VALUES (
        $1,$2,$3,$4,
        $5,$6,
        $7,
        $8,$9,
        $10,$11,
        $12,
        $13,$14,$15
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
        apiMode,

        pinSendUrl,
        pinSendParams,

        pinVerifyUrl,
        pinVerifyParams,

        statusCheckUrl,

        fraudEnabled,
        fraudPartner,
        fraudService,
      ]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("CREATE OFFER ERROR:", err);
    res.status(500).json({ message: "Failed to create offer" });
  }
});

/* =====================================================
   TOGGLE OFFER STATUS (Active / Paused)
===================================================== */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `
      UPDATE offers
      SET status = CASE
        WHEN status = 'Active' THEN 'Paused'
        ELSE 'Active'
      END
      WHERE id = $1
      RETURNING *
    `,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("TOGGLE STATUS ERROR:", err);
    res.status(500).json({ message: "Failed to update status" });
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
