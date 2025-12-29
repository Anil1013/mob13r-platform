import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =========================
   GET OFFERS (by advertiser)
========================= */
router.get("/", async (req, res) => {
  try {
    const { advertiser_id } = req.query;

    if (!advertiser_id) {
      return res.status(400).json({ message: "advertiser_id required" });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM offers
      WHERE advertiser_id = $1
      ORDER BY id DESC
      `,
      [advertiser_id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET OFFERS ERROR:", err.message);
    return res.status(500).json({ message: "Failed to fetch offers" });
  }
});

/* =========================
   CREATE OFFER
========================= */
router.post("/", async (req, res) => {
  try {
    const {
      advertiser_id,
      service_name,
      cpa,
      daily_cap,
      geo,
      carrier,
      service_type,
    } = req.body;

    if (!advertiser_id || !service_name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await pool.query(
      `
      INSERT INTO offers
      (
        advertiser_id,
        service_name,
        cpa,
        daily_cap,
        geo,
        carrier,
        service_type,
        today_hits,
        last_reset_date,
        status
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,0,CURRENT_DATE,'active')
      RETURNING *
      `,
      [
        advertiser_id,
        service_name,
        cpa || 0,
        daily_cap || null,
        geo,
        carrier,
        service_type || "NORMAL",
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("CREATE OFFER ERROR:", err.message);
    return res.status(500).json({ message: "Failed to create offer" });
  }
});

/* =========================
   GET OFFER PARAMETERS
========================= */
router.get("/:offerId/parameters", async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    if (isNaN(offerId)) {
      return res.status(400).json({ message: "Invalid offerId" });
    }

    const result = await pool.query(
      `
      SELECT id, param_key, param_value
      FROM offer_parameters
      WHERE offer_id = $1
      ORDER BY id ASC
      `,
      [offerId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET PARAMETERS ERROR:", err.message);
    return res.status(500).json({ message: "Failed to fetch parameters" });
  }
});

/* =========================
   ADD OFFER PARAMETER
========================= */
router.post("/:offerId/parameters", async (req, res) => {
  try {
    const offerId = Number(req.params.offerId);
    const { param_key, param_value } = req.body;

    if (isNaN(offerId)) {
      return res.status(400).json({ message: "Invalid offerId" });
    }

    if (!param_key || !param_value) {
      return res.status(400).json({
        message: "param_key and param_value required",
      });
    }

    /* prevent duplicate param */
    const exists = await pool.query(
      `
      SELECT id
      FROM offer_parameters
      WHERE offer_id = $1 AND param_key = $2
      `,
      [offerId, param_key]
    );

    if (exists.rows.length) {
      return res.status(400).json({
        message: "param_key already exists for this offer",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO offer_parameters
      (offer_id, param_key, param_value)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [offerId, param_key, param_value]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("ADD PARAMETER ERROR:", err.message);
    return res.status(500).json({ message: "Failed to add parameter" });
  }
});

/* =========================
   DELETE OFFER PARAMETER
========================= */
router.delete("/parameters/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid parameter id" });
    }

    await pool.query(
      `
      DELETE FROM offer_parameters
      WHERE id = $1
      `,
      [id]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE PARAM ERROR:", err.message);
    return res.status(500).json({ message: "Failed to delete parameter" });
  }
});

export default router;
