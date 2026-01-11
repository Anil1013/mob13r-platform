import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

/* ================= PREFLIGHT ================= */
router.options("/dashboard/dump", (req, res) => {
  return res.sendStatus(204);
});

/* ================= DUMP DASHBOARD ================= */
router.get(
  "/dashboard/dump",
  authMiddleware,
  async (req, res) => {
    try {
      const query = `
        SELECT
          ps.id                                  AS session_id,
          po.offer_id                           AS offer_id,
          pub.name                              AS publisher_name,
          o.title                               AS offer_name,

          ps.geo,
          ps.carrier,
          ps.msisdn,

          ps.publisher_request,
          ps.publisher_response,
          ps.adv_request                        AS advertiser_request,
          ps.adv_response                       AS advertiser_response,

          ps.status,

          (ps.created_at AT TIME ZONE 'UTC'
            AT TIME ZONE 'Asia/Kolkata')         AS created_ist

        FROM pin_sessions ps
        JOIN publisher_offers po ON po.id = ps.publisher_offer_id
        JOIN publishers pub      ON pub.id = po.publisher_id
        JOIN offers o            ON o.id = po.offer_id

        ORDER BY ps.created_at DESC
        LIMIT 500;
      `;

      const { rows } = await pool.query(query);

      return res.json({
        success: true,
        count: rows.length,
        data: rows,
      });
    } catch (err) {
      console.error("❌ Dump Dashboard Error:", err);
      return res.status(500).json({
        success: false,
        error: "Failed to load dump dashboard",
      });
    }
  }
);

export default router;
