import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/*
 GET /api/reports/inapp?from=YYYY-MM-DD&to=YYYY-MM-DD&pub_id=PUB05
*/
router.get("/", authJWT, async (req, res) => {
  try {
    const { from, to, pub_id } = req.query;

    const params = [];
    let where = `WHERE ptl.type = 'INAPP'`;

    if (from) {
      params.push(from);
      where += ` AND ps.created_at::date >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      where += ` AND ps.created_at::date <= $${params.length}`;
    }

    if (pub_id) {
      params.push(pub_id);
      where += ` AND ptl.pub_code = $${params.length}`;
    }

    const sql = `
      SELECT
        ptl.pub_code                              AS "PUB_ID",
        ptl.publisher_name                       AS "Publisher Name",
        o.advertiser_name                        AS "Advertiser Name",
        o.offer_id                               AS "Offer ID",
        o.name                                   AS "Offer Name",
        DATE(ps.created_at)                      AS "Report Date",

        COUNT(ps.id)                             AS "Pin Request Count",
        COUNT(DISTINCT ps.msisdn)                AS "Unique Pin Request Count",

        COUNT(ps.id)                             AS "Pin Send Count",
        COUNT(DISTINCT ps.msisdn)                AS "Unique Pin Send Count",

        COUNT(pv.id)                             AS "Pin Validation Request Count",
        COUNT(DISTINCT pv.msisdn)                AS "Unique Pin Validation Request Count",

        COUNT(pv.id) FILTER (WHERE pv.status = 'SUCCESS')
                                                 AS "Pin Validate Count",

        COUNT(pv.id) FILTER (WHERE pv.status = 'SUCCESS')
                                                 AS "Send Conversion Count",

        ROUND(
          COUNT(pv.id) FILTER (WHERE pv.status = 'SUCCESS')
          * o.payout, 4
        )                                        AS "Advertiser Amount ($)",

        ROUND(
          COUNT(pv.id) FILTER (WHERE pv.status = 'SUCCESS')
          * ptl.payout, 4
        )                                        AS "Publisher Amount ($)",

        MAX(ps.created_at)                       AS "Last PinGen Time",
        MAX(ps.created_at) FILTER (WHERE ps.status = 'SUCCESS')
                                                 AS "Last PinGen Success Time",

        MAX(pv.created_at)                       AS "Last PinVerification Date Time",
        MAX(pv.created_at) FILTER (WHERE pv.status = 'SUCCESS')
                                                 AS "Last Success PinVerification Date Time"

      FROM pin_send_logs ps
      JOIN publisher_tracking_links ptl
        ON ptl.id = ps.tracking_link_id
      JOIN offers o
        ON o.offer_id = ps.offer_id
      LEFT JOIN pin_verify_logs pv
        ON pv.click_id = ps.click_id

      ${where}

      GROUP BY
        ptl.pub_code,
        ptl.publisher_name,
        o.advertiser_name,
        o.offer_id,
        o.name,
        o.payout,
        ptl.payout,
        DATE(ps.created_at)

      ORDER BY DATE(ps.created_at) DESC;
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);

  } catch (err) {
    console.error("INAPP REPORT ERROR:", err);
    res.status(500).json({ error: "Failed to fetch inapp report" });
  }
});

export default router;
