import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/report", async (req, res) => {
  try {
    const {
      offer_id,
      publisher_id,
      from_date,
      to_date
    } = req.query;

    let conditions = [];
    let values = [];
    let i = 1;

    // Filters
    if (offer_id) {
      conditions.push(`ps.offer_id = $${i++}`);
      values.push(offer_id);
    }

    if (publisher_id) {
      conditions.push(`ps.publisher_id = $${i++}`);
      values.push(publisher_id);
    }

    if (from_date) {
      conditions.push(`DATE(ps.created_at) >= $${i++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`DATE(ps.created_at) <= $${i++}`);
      values.push(to_date);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const query = `
      SELECT
        ps.offer_id,
        o.name AS offer_name,
        ps.publisher_id,

        COUNT(*) AS total_requests,

        COUNT(*) FILTER (WHERE ps.status = 'VERIFIED') AS verified,
        COUNT(*) FILTER (WHERE ps.status = 'FAILED') AS failed,
        COUNT(*) FILTER (WHERE ps.status = 'OTP_INVALID') AS otp_invalid,

        COALESCE(MAX(o.cpa), 0) AS cpa,

        COUNT(*) FILTER (WHERE ps.status = 'VERIFIED') * COALESCE(MAX(o.cpa), 0) AS revenue

      FROM pin_sessions ps
      LEFT JOIN offers o ON ps.offer_id = o.id

      ${whereClause}

      GROUP BY
        ps.offer_id,
        o.name,
        ps.publisher_id

      ORDER BY total_requests DESC
    `;

    const { rows } = await pool.query(query, values);

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error("REPORT ERROR:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
