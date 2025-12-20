import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * GET /api/reports/inapp?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get("/", authJWT, async (req, res) => {
  try {
    const { from, to } = req.query;

    const query = `
      SELECT
        ptl.pub_code                                AS "PUB_ID",
        pub.name                                   AS "Publisher Name",
        o.advertiser_name                          AS "Advertiser Name",
        o.offer_id                                 AS "Offer ID",
        o.name                                     AS "Offer Name",
        DATE(ps.created_at)                        AS "Report Date",

        COUNT(ps.id)                               AS "Pin Request Count",
        COUNT(DISTINCT ps.msisdn)                  AS "Unique Pin Request Count",

        COUNT(ps.id) FILTER (WHERE ps.api_status = 'SUCCESS')
                                                   AS "Pin Send Count",
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.api_status = 'SUCCESS')
                                                   AS "Unique Pin Send Count",

        COUNT(pv.id)                               AS "Pin Validation Request Count",
        COUNT(DISTINCT pv.msisdn)                  AS "Unique Pin Validation Request Count",

        COUNT(pv.id) FILTER (WHERE pv.status = 'SUCCESS')
                                                   AS "Pin Validate Count",

        COUNT(pv.id) FILTER (WHERE pv.status = 'SUCCESS')
                                                   AS "Send Conversion Count",

        o.payout                                   AS "Advertiser Amount",
        ptl.payout                                 AS "Publisher Amount",

        MAX(ps.created_at)                         AS "Last PinGen Time",
        MAX(ps.created_at) FILTER (WHERE ps.api_status = 'SUCCESS')
                                                   AS "Last PinGen Success Time",

        MAX(pv.created_at)                         AS "Last PinVerification Date Time",
        MAX(pv.created_at) FILTER (WHERE pv.status = 'SUCCESS')
                                                   AS "Last Success PinVerification Date Time"

      FROM pin_send_logs ps
      JOIN publisher_tracking_links ptl
        ON ptl.id = ps.tracking_link_id
      JOIN publishers pub
        ON pub.id = ptl.publisher_id
      JOIN offers o
        ON o.offer_id = ps.offer_id
      LEFT JOIN pin_verify_logs pv
        ON pv.msisdn = ps.msisdn
       AND pv.offer_id = ps.offer_id

      WHERE ps.created_at::date BETWEEN $1 AND $2

      GROUP BY
        ptl.pub_code,
        pub.name,
        o.advertiser_name,
        o.offer_id,
        o.name,
        o.payout,
        ptl.payout,
        DATE(ps.created_at)

      ORDER BY "Report Date" DESC;
    `;

    const { rows } = await pool.query(query, [from, to]);
    res.json(rows);

  } catch (err) {
    console.error("❌ INAPP REPORT SQL ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch inapp report" });
  }
});

export default router;
