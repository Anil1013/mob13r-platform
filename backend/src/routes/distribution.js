import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * GET meta data for a PUB_ID
 * Returns publisher info + geo + carrier + offers
 */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ error: "pub_id is required" });
    }

    const result = await pool.query(
      `SELECT id, pub_code, publisher_id, publisher_name,
              geo, carrier, name, type, payout, cap_daily, cap_total,
              tracking_url, pin_send_url, pin_verify_url, check_status_url, portal_url
       FROM tracking
       WHERE pub_code = $1`,
      [pub_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "PUB_ID not found" });
    }

    res.json({
      success: true,
      pub_id,
      publisher_name: result.rows[0].publisher_name,
      geo: result.rows[0].geo,
      carrier: result.rows[0].carrier,
      offers: result.rows,
    });

  } catch (err) {
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

/** Save routing rules */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, rules } = req.body;

    if (!pub_id || !rules) {
      return res.status(400).json({ error: "pub_id & rules required" });
    }

    await pool.query(
      "INSERT INTO traffic_rules (pub_code, rules) VALUES ($1, $2) ON CONFLICT (pub_code) DO UPDATE SET rules=$2",
      [pub_id, rules]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

export default router;
