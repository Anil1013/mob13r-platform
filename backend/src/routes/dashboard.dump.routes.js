import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

router.get("/dashboard/dump", orgAuth, async (req, res) => {
  try {
    const query = `
      SELECT
        ps.session_id,
        o.id AS offer_id, o.service_name AS offer_name, o.geo, o.carrier,
        pub.id AS publisher_id, pub.name AS publisher_name,
        adv.id AS advertiser_id, adv.name AS advertiser_name,
        ps.msisdn, ps.status,
        ps.publisher_request, ps.publisher_response,
        ps.advertiser_request, ps.advertiser_response,
        to_char(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY, HH12:MI:SS AM') AS created_ist
      FROM pin_sessions ps
      JOIN offers o ON o.id = ps.offer_id
      LEFT JOIN publishers pub ON pub.id = ps.publisher_id
      LEFT JOIN advertisers adv ON adv.id = o.advertiser_id
      WHERE ps.org_id = $1
      ORDER BY ps.created_at DESC
      LIMIT 500;
    `;
    const { rows } = await pool.query(query, [req.orgId]);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("Dump Dashboard Error:", err);
    res.status(500).json({ success: false, message: "Dump dashboard failed" });
  }
});

export default router;
