import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateInput(value) {
  if (!value) return true;
  return DATE_REGEX.test(value);
}

function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const yyyy = ist.getUTCFullYear();
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildCommonFilters({ from, to, geo, carrier, publisher, advertiser, offer_id }) {
  const conditions = [];
  const values = [];

  values.push(from);
  values.push(to);

  conditions.push(`
    ps.created_at >= ($1::date - INTERVAL '5 hours 30 minutes')
    AND ps.created_at < ($2::date + INTERVAL '1 day' - INTERVAL '5 hours 30 minutes')
  `);

  if (geo) {
    values.push(String(geo).trim().toUpperCase());
    conditions.push(`TRIM(UPPER(ps.params->>'geo')) = $${values.length}`);
  }

  if (carrier) {
    values.push(String(carrier).trim().toUpperCase());
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

  return { values, whereClause: `WHERE ${conditions.join(" AND ")}` };
}

router.get("/dashboard/report", authMiddleware, async (req, res) => {
  try {
    let { from, to, geo, carrier, publisher, advertiser, offer_id, view } = req.query;

    if (!from || !to) {
      from = todayIST();
      to = todayIST();
    }

    if (!isValidDateInput(from) || !isValidDateInput(to)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid date format",
      });
    }

    const { values, whereClause } = buildCommonFilters({
      from,
      to,
      geo,
      carrier,
      publisher,
      advertiser,
      offer_id,
    });

    const isDaily = view === "daily";
    const groupByDate = `DATE(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')`;

    const groupBy = isDaily ? `${groupByDate}, o.id` : `o.id`;
    const selectDate = isDaily ? `${groupByDate} AS date,` : "";

    const query = `
      SELECT
        ${selectDate}

         a.name AS advertiser_name_raw,
         o.service_name AS offer_name_raw,
         p.name AS publisher_name_raw,

        COALESCE(a.name, 'Unknown Advertiser') AS advertiser_name,
        COALESCE(o.service_name, 'Unknown Offer') AS offer_name,
        COALESCE(p.name, 'Unknown Publisher') AS publisher_name,

        TRIM(UPPER(ps.params->>'geo')) AS geo_raw,
        TRIM(UPPER(ps.params->>'carrier')) AS carrier_raw,

        COALESCE(TRIM(UPPER(ps.params->>'geo')), 'UNKNOWN') AS geo,
        COALESCE(TRIM(UPPER(ps.params->>'carrier')), 'UNKNOWN') AS carrier,

        o.cpa,
        po.publisher_cpa,
        o.daily_cap AS cap,
        po.daily_cap AS publisher_cap,

        COUNT(*) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS pin_req,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS unique_req,

        COUNT(*) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS pin_sent,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS unique_sent,

        COUNT(*) FILTER (
          WHERE ps.parent_session_token IS NOT NULL
        ) AS verify_req,

        COUNT(DISTINCT ps.msisdn) FILTER (
          WHERE ps.parent_session_token IS NOT NULL
        ) AS unique_verify,

        COUNT(*) FILTER (
          WHERE ps.status = 'VERIFIED'
          AND ps.parent_session_token IS NOT NULL
        ) AS verified,

        COUNT(*) FILTER (
          WHERE ps.status = 'VERIFIED'
          AND ps.publisher_credited = TRUE
        ) AS publisher_verified,

        ROUND(
          COUNT(*) FILTER (
            WHERE ps.status = 'VERIFIED'
            AND ps.publisher_credited = TRUE
          )::numeric /
          NULLIF(
            COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status = 'OTP_SENT'),
            0
          ) * 100,
          2
        ) AS publisher_cr,

        COALESCE(
          SUM(ps.publisher_cpa) FILTER (
            WHERE ps.status = 'VERIFIED'
            AND ps.publisher_credited = TRUE
          ),
          0
        ) AS publisher_revenue,

        (
          COALESCE(
            SUM(ps.payout) FILTER (
              WHERE ps.status = 'VERIFIED'
              AND ps.parent_session_token IS NOT NULL
            ),
            0
          ) -
          COALESCE(
            SUM(ps.publisher_cpa) FILTER (
              WHERE ps.status = 'VERIFIED'
              AND ps.publisher_credited = TRUE
            ),
            0
          )
        ) AS profit,

        ROUND(
          COUNT(*) FILTER (
            WHERE ps.status = 'VERIFIED'
            AND ps.parent_session_token IS NOT NULL
          )::numeric /
          NULLIF(
            COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status = 'OTP_SENT'),
            0
          ) * 100,
          2
        ) AS cr_percent,

        COALESCE(
          SUM(ps.payout) FILTER (
            WHERE ps.status = 'VERIFIED'
            AND ps.parent_session_token IS NOT NULL
          ),
          0
        ) AS revenue,

        to_char(
          MAX(ps.created_at) FILTER (WHERE ps.status = 'OTP_SENT')
            AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata',
          'DD/MM/YYYY, HH12:MI:SS AM'
        ) AS last_pin_gen,

        to_char(
          MAX(ps.created_at) FILTER (WHERE ps.parent_session_token IS NOT NULL)
            AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata',
          'DD/MM/YYYY, HH12:MI:SS AM'
        ) AS last_verification,

        to_char(
          MAX(ps.created_at) FILTER (
            WHERE ps.status = 'VERIFIED'
            AND ps.parent_session_token IS NOT NULL
          ) AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata',
          'DD/MM/YYYY, HH12:MI:SS AM'
        ) AS last_success_verification

      FROM pin_sessions ps
      LEFT JOIN offers o ON o.id = ps.offer_id
      LEFT JOIN publishers p ON p.id = ps.publisher_id
      LEFT JOIN advertisers a ON a.id = o.advertiser_id
      LEFT JOIN publisher_offers po ON po.id = ps.publisher_offer_id

      ${whereClause}

      GROUP BY ${groupBy},
      
       p.id,
       a.name,
       o.service_name,
       p.name,
       TRIM(UPPER(ps.params->>'geo')),
       TRIM(UPPER(ps.params->>'carrier')),
       o.cpa,
       o.daily_cap,
       po.publisher_cpa,
       po.daily_cap

      ORDER BY ${isDaily ? "date DESC," : ""} offer_name;
    `;

    const result = await pool.query(query, values);

    return res.json({
      status: "SUCCESS",
      view: isDaily ? "daily" : "summary",
      from,
      to,
      data: result.rows,
    });
  } catch (err) {
    console.error("DASHBOARD ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

router.get("/dashboard/realtime", authMiddleware, async (req, res) => {
  try {
    let { from, to, geo, carrier, publisher, advertiser, offer_id } = req.query;

    if (!from || !to) {
      from = todayIST();
      to = todayIST();
    }

    if (!isValidDateInput(from) || !isValidDateInput(to)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid date format",
      });
    }

    const { values, whereClause } = buildCommonFilters({
      from,
      to,
      geo,
      carrier,
      publisher,
      advertiser,
      offer_id,
    });

    const stats = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
        ) AS total_requests,

        COUNT(*) FILTER (
          WHERE ps.status = 'OTP_SENT'
        ) AS otp_sent,

        COUNT(*) FILTER (
          WHERE ps.status = 'VERIFIED'
          AND ps.parent_session_token IS NOT NULL
        ) AS conversions,

        COUNT(*) FILTER (
          WHERE ps.created_at >= NOW() - INTERVAL '1 hour'
        ) AS last_hour_requests

      FROM pin_sessions ps
      LEFT JOIN offers o ON o.id = ps.offer_id
      ${whereClause};
      `,
      values
    );

    return res.json({
      status: "SUCCESS",
      data: stats.rows[0] || {},
    });
  } catch (err) {
    console.error("REALTIME DASHBOARD ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to fetch realtime stats",
    });
  }
});

router.get("/dashboard/filters", authMiddleware, async (_req, res) => {
  try {
    const advertisers = await pool.query(`
      SELECT id, name
      FROM advertisers
      ORDER BY name;
    `);

    const publishers = await pool.query(`
      SELECT id, name
      FROM publishers
      ORDER BY name;
    `);

    const offers = await pool.query(`
      SELECT id, service_name
      FROM offers
      WHERE status = 'active'
      ORDER BY service_name;
    `);

    const geos = await pool.query(`
      SELECT DISTINCT TRIM(UPPER(params->>'geo')) AS geo
      FROM pin_sessions
      WHERE params->>'geo' IS NOT NULL
        AND params->>'geo' <> ''
      ORDER BY geo;
    `);

    const carriers = await pool.query(`
      SELECT DISTINCT TRIM(UPPER(params->>'carrier')) AS carrier
      FROM pin_sessions
      WHERE params->>'carrier' IS NOT NULL
        AND params->>'carrier' <> ''
      ORDER BY carrier;
    `);

    return res.json({
      status: "SUCCESS",
      advertisers: advertisers.rows || [],
      publishers: publishers.rows || [],
      offers: (offers.rows || []).map(item => ({
        id: item.id,
        offer_name: item.service_name,
      })),
      geos: (geos.rows || []).map(item => item.geo),
      carriers: (carriers.rows || []).map(item => item.carrier),
    });
  } catch (err) {
    console.error("FILTER API ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Failed to fetch dashboard filters",
    });
  }
});

export default router;
