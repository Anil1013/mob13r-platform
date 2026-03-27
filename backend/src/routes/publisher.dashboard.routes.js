import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateInput(value) {
  if (!value) return true;
  return DATE_REGEX.test(value);
}

/*
=====================================================
PUBLISHER DASHBOARD REPORT (FINAL)
=====================================================
*/
router.get("/dashboard/report", authMiddleware, async (req, res) => {
  try {
    let {
      from,
      to,
      geo,
      carrier,
      publisher,
      advertiser,
      offer_id,
      view
    } = req.query;

    /* ✅ DEFAULT TODAY IST */
    if (!from || !to) {
      const now = new Date();
      const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);

      const yyyy = ist.getFullYear();
      const mm = String(ist.getMonth() + 1).padStart(2, "0");
      const dd = String(ist.getDate()).padStart(2, "0");

      from = `${yyyy}-${mm}-${dd}`;
      to = `${yyyy}-${mm}-${dd}`;
    }

    if (!isValidDateInput(from) || !isValidDateInput(to)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid date format",
      });
    }

    const conditions = [];
    const values = [];

    /* ✅ IST → UTC */
    values.push(from);
    values.push(to);

    conditions.push(`
      ps.created_at >= ($${values.length - 1}::date - INTERVAL '5 hours 30 minutes')
      AND ps.created_at < ($${values.length}::date + INTERVAL '1 day' - INTERVAL '5 hours 30 minutes')
    `);

    /* FILTERS */
    if (geo) {
      values.push(geo.trim().toUpperCase());
      conditions.push(`TRIM(UPPER(ps.params->>'geo')) = $${values.length}`);
    }

    if (carrier) {
      values.push(carrier.trim().toUpperCase());
      conditions.push(`TRIM(UPPER(ps.params->>'carrier')) = $${values.length}`);
    }

    if (publisher) {
      values.push(Number(publisher));
      conditions.push(`ps.publisher_id = $${values.length}`);
    }

    if (offer_id) {
      values.push(Number(offer_id));
      conditions.push(`ps.offer_id = $${values.length}`);
    }

    if (advertiser) {
      values.push(advertiser);
      conditions.push(`o.advertiser_id = $${values.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    /* VIEW MODE */
    const isDaily = view === "daily";

    const groupBy = isDaily
      ? `DATE(ps.created_at), o.id`
      : `o.id`;

    const selectDate = isDaily
      ? `DATE(ps.created_at) AS date,`
      : ``;

    const query = `
      SELECT
        ${selectDate}

        COALESCE(a.name,'Unknown Advertiser') AS advertiser_name,
        COALESCE(o.service_name,'Unknown Offer') AS offer_name,
        COALESCE(p.name,'Unknown Publisher') AS publisher_name,

        COALESCE(TRIM(UPPER(ps.params->>'geo')),'UNKNOWN') AS geo,
        COALESCE(TRIM(UPPER(ps.params->>'carrier')),'UNKNOWN') AS carrier,

        o.cpa,
        o.daily_cap AS cap,

        /* REQUEST */
        COUNT(*) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS pin_req,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS unique_req,

        /* SENT */
        COUNT(*) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS pin_sent,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS unique_sent,

        /* VERIFY */
        COUNT(*) FILTER (
          WHERE ps.parent_session_token IS NOT NULL
        ) AS verify_req,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.parent_session_token IS NOT NULL
        ) AS unique_verify,

        /* VERIFIED */
        COUNT(*) FILTER (
          WHERE ps.status = 'VERIFIED'
          AND ps.parent_session_token IS NOT NULL
        ) AS verified,

        /* CR */
        ROUND(
          COUNT(*) FILTER (
            WHERE ps.status = 'VERIFIED'
            AND ps.parent_session_token IS NOT NULL
          )::numeric
          /
          NULLIF(
            COUNT(DISTINCT ps.msisdn)
            FILTER (WHERE ps.status = 'OTP_SENT'),
            0
          ) * 100,
          2
        ) AS cr_percent,

        /* 🔥 PUBLISHER REVENUE (FIXED) */
        COALESCE(
          SUM(pc.publisher_cpa) FILTER (WHERE pc.status = 'SUCCESS'),
          0
        ) AS revenue,

        /* TIMES */
        MAX(ps.created_at)
          FILTER (WHERE ps.status = 'OTP_SENT') AS last_pin_gen,

        MAX(ps.created_at)
          FILTER (WHERE ps.parent_session_token IS NOT NULL) AS last_verification,

        MAX(ps.created_at)
          FILTER (
            WHERE ps.status = 'VERIFIED'
            AND ps.parent_session_token IS NOT NULL
          ) AS last_success_verification

      FROM pin_sessions ps
      LEFT JOIN offers o ON o.id = ps.offer_id
      LEFT JOIN publishers p ON p.id = ps.publisher_id
      LEFT JOIN advertisers a ON a.id = o.advertiser_id

      /* 🔥 JOIN CONVERSIONS */
      LEFT JOIN publisher_conversions pc
        ON pc.pin_session_uuid = ps.session_token

      ${whereClause}

      GROUP BY ${groupBy},
        a.name,
        o.service_name,
        p.name,
        TRIM(UPPER(ps.params->>'geo')),
        TRIM(UPPER(ps.params->>'carrier')),
        o.cpa,
        o.daily_cap

      ORDER BY ${isDaily ? "date DESC," : ""} offer_name;
    `;

    const result = await pool.query(query, values);

    res.json({
      status: "SUCCESS",
      view: isDaily ? "daily" : "summary",
      data: result.rows
    });

  } catch (err) {
    console.error("PUBLISHER DASHBOARD ERROR:", err);
    res.status(500).json({ status: "FAILED" });
  }
});

/*
=====================================================
REALTIME
=====================================================
*/
router.get("/dashboard/realtime", authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.query;

    let conditions = [];
    let values = [];

    if (from && to) {
      values.push(from);
      values.push(to);

      conditions.push(`
        created_at >= ($${values.length - 1}::date - INTERVAL '5 hours 30 minutes')
        AND created_at < ($${values.length}::date + INTERVAL '1 day' - INTERVAL '5 hours 30 minutes')
      `);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS total_requests,

        COUNT(*) FILTER (
          WHERE status = 'OTP_SENT'
        ) AS otp_sent,

        COUNT(*) FILTER (
          WHERE status = 'VERIFIED'
        ) AS conversions,

        COUNT(*) FILTER (
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        ) AS last_hour_requests

      FROM pin_sessions
      ${where}
    `, values);

    res.json({
      status: "SUCCESS",
      data: stats.rows[0]
    });

  } catch (err) {
    console.error("REALTIME ERROR:", err);
    res.status(500).json({ status: "FAILED" });
  }
});

/*
=====================================================
HOURLY DASHBOARD (FIXED)
=====================================================
*/
router.get(
  "/dashboard/offers/:publisherOfferId/hourly",
  publisherAuth,
  async (req, res) => {
    try {
      const publisherId = req.publisher.id;
      const { publisherOfferId } = req.params;
      let { from, to } = req.query;

      if (!from || !to) {
        from = todayIST();
        to = todayIST();
      }

      const params = [publisherId, publisherOfferId, from, to];

      const query = `

SELECT

DATE_TRUNC(
  'hour',
  ps.created_at AT TIME ZONE 'Asia/Kolkata'
) AS hour,

COUNT(DISTINCT ps.msisdn) AS unique_pin_requests,

COUNT(DISTINCT ps.msisdn) FILTER (
WHERE ps.status IN ('OTP_SENT','VERIFIED')
) AS unique_pin_sent,

COUNT(DISTINCT ps.msisdn) FILTER (
WHERE ps.otp_attempts > 0
) AS unique_pin_verification_requests,

COUNT(DISTINCT pc.pin_session_uuid) AS pin_verified,

COALESCE(SUM(pc.publisher_cpa), 0) AS revenue

FROM publisher_offers po

JOIN pin_sessions ps
ON ps.publisher_offer_id = po.id

LEFT JOIN publisher_conversions pc
ON pc.pin_session_uuid = ps.session_id
AND pc.status = 'SUCCESS'

WHERE po.publisher_id = $1
AND po.id = $2
AND ps.created_at >= $3::date
AND ps.created_at < ($4::date + INTERVAL '1 day')

GROUP BY hour
ORDER BY hour ASC;

`;

      const { rows } = await pool.query(query, params);

      res.json({
        offer_id: publisherOfferId,
        from,
        to,
        rows,
      });

    } catch (err) {
      console.error("❌ HOURLY DASHBOARD ERROR:", err);
      res.status(500).json({ error: "Failed to load hourly data" });
    }
  }
);

export default router;
