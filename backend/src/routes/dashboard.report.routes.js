import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
=====================================================
DASHBOARD REPORT (PURE UTC)
=====================================================
*/

router.get("/dashboard/report", async (req, res) => {

 try {

  const { from, to, geo, carrier, publisher, offer_id, advertiser } = req.query;

  let conditions = [];
  let values = [];

  // ✅ DATE FILTER (UTC)
  if (from) {
   values.push(from);
   conditions.push(`
    DATE(ps.created_at) >= $${values.length}
   `);
  }

  if (to) {
   values.push(to);
   conditions.push(`
    DATE(ps.created_at) <= $${values.length}
   `);
  }

  // ✅ DROPDOWN FILTERS
 if (geo && geo !== "") {
 values.push(geo);
 conditions.push(`
  TRIM(UPPER(ps.params->>'geo')) = $${values.length}
 `);
}

if (carrier && carrier !== "") {
 values.push(carrier);
 conditions.push(`
  TRIM(UPPER(ps.params->>'carrier')) = $${values.length}
 `);
}

  if (publisher && publisher !== "") {
   values.push(publisher);
   conditions.push(`ps.publisher_id = $${values.length}`);
  }

  if (offer_id && offer_id !== "") {
   values.push(offer_id);
   conditions.push(`ps.offer_id = $${values.length}`);
  }

  if (advertiser && advertiser !== "") {
   values.push(advertiser);
   conditions.push(`o.advertiser_id = $${values.length}`);
  }

  const where =
   conditions.length > 0
    ? "WHERE " + conditions.join(" AND ")
    : "";

  const query = `

SELECT

DATE(ps.created_at) AS date,

COALESCE(a.name,'Unknown Advertiser') AS advertiser_name,
COALESCE(o.service_name,'Unknown Offer') AS offer_name,
COALESCE(p.name,'Unknown Publisher') AS publisher_name,

COALESCE(ps.params->>'geo','Unknown') AS geo,
COALESCE(ps.params->>'carrier','Unknown') AS carrier,

o.cpa,
o.capping AS cap,

COUNT(*) FILTER (
WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
) AS pin_req,

COUNT(DISTINCT ps.msisdn)
FILTER (
WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
) AS unique_req,

COUNT(*) FILTER (
WHERE ps.status='OTP_SENT'
) AS pin_sent,

COUNT(DISTINCT ps.msisdn)
FILTER (
WHERE ps.status='OTP_SENT'
) AS unique_sent,

COUNT(*) FILTER (
WHERE ps.parent_session_token IS NOT NULL
) AS verify_req,

COUNT(DISTINCT ps.msisdn)
FILTER (
WHERE ps.parent_session_token IS NOT NULL
) AS unique_verify,

COUNT(*) FILTER (
WHERE ps.status='VERIFIED'
) AS verified,

ROUND(
COUNT(*) FILTER (WHERE ps.status='VERIFIED')::numeric /
NULLIF(
COUNT(*) FILTER (WHERE ps.parent_session_token IS NOT NULL),0
)*100,2
) AS cr_percent,

COALESCE(
  SUM(ps.payout) FILTER (WHERE ps.status='VERIFIED'),
  0
) AS revenue,

-- ✅ PURE UTC TIMES
MAX(ps.created_at)
FILTER (WHERE ps.status='OTP_SENT') AS last_pin_gen,

MAX(ps.created_at)
FILTER (WHERE ps.parent_session_token IS NOT NULL) AS last_verification,

MAX(ps.created_at)
FILTER (WHERE ps.status='VERIFIED') AS last_success_verification

FROM pin_sessions ps

LEFT JOIN offers o ON o.id = ps.offer_id
LEFT JOIN publishers p ON p.id = ps.publisher_id
LEFT JOIN advertisers a ON a.id = o.advertiser_id

${where}

GROUP BY
DATE(ps.created_at),
a.name,
o.service_name,
p.name,
ps.params->>'geo',
ps.params->>'carrier',
o.cpa,
o.capping

ORDER BY date DESC

`;

  const result = await pool.query(query, values);

  res.json({
   status: "SUCCESS",
   data: result.rows
  });

 } catch (err) {

  console.error("DASHBOARD REPORT ERROR:", err);

  res.status(500).json({
   status: "FAILED"
  });

 }

});


/*
=====================================================
REALTIME (PURE UTC)
=====================================================
*/

router.get("/dashboard/realtime", async (req, res) => {

 try {

  const stats = await pool.query(`

SELECT

COUNT(*) FILTER (
WHERE status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
) AS total_requests,

COUNT(*) FILTER (
WHERE status='OTP_SENT'
) AS otp_sent,

COUNT(*) FILTER (
WHERE status='VERIFIED'
) AS conversions,

COUNT(*) FILTER (
WHERE created_at >= NOW() - INTERVAL '1 hour'
) AS last_hour_requests

FROM pin_sessions

`);

  res.json({
   status: "SUCCESS",
   data: stats.rows[0]
  });

 } catch (err) {

  console.error("REALTIME DASHBOARD ERROR:", err);

  res.status(500).json({
   status: "FAILED"
  });

 }

});


/*
=====================================================
FILTERS (UNCHANGED)
=====================================================
*/

router.get("/dashboard/filters", async (req, res) => {

 try {

  const advertisers = await pool.query(`
    SELECT id, name
    FROM advertisers
    ORDER BY name
  `);

  const publishers = await pool.query(`
    SELECT id, name
    FROM publishers
    ORDER BY name
  `);

  const offers = await pool.query(`
    SELECT id, service_name
    FROM offers
    WHERE status = 'active'
    ORDER BY service_name
  `);

  const geos = await pool.query(`
  SELECT DISTINCT TRIM(UPPER(params->>'geo')) AS geo
  FROM pin_sessions
  WHERE params->>'geo' IS NOT NULL AND params->>'geo' <> ''
  ORDER BY geo
`);

const carriers = await pool.query(`
  SELECT DISTINCT TRIM(UPPER(params->>'carrier')) AS carrier
  FROM pin_sessions
  WHERE params->>'carrier' IS NOT NULL AND params->>'carrier' <> ''
  ORDER BY carrier
`);

  res.json({

    advertisers: advertisers.rows || [],
    publishers: publishers.rows || [],
    offers: offers.rows.map(o => ({
      id: o.id,
      offer_name: o.service_name
    })),
    geos: geos.rows.map(g => g.geo),
    carriers: carriers.rows.map(c => c.carrier)

  });

 } catch (err) {

  console.error("FILTER API ERROR:", err);

  res.status(500).json({
    status: "FAILED"
  });

 }

});

export default router;
