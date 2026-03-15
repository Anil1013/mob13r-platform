import express from "express";
import pool from "../db.js";

const router = express.Router();

/*
=====================================================
DASHBOARD REPORT (DATE / OPERATOR / OFFER FILTER)
=====================================================
*/

router.get("/dashboard/report", async (req, res) => {

 try {

  const { from, to, operator, offer_id } = req.query;

  let conditions = [];
  let values = [];

  /* DATE FILTER */

  if (from) {
   values.push(from);
   conditions.push(`DATE(ps.created_at) >= $${values.length}`);
  }

  if (to) {
   values.push(to);
   conditions.push(`DATE(ps.created_at) <= $${values.length}`);
  }

  /* OPERATOR FILTER */

  if (operator) {
   values.push(operator);
   conditions.push(`ps.carrier = $${values.length}`);
  }

  /* OFFER FILTER */

  if (offer_id) {
   values.push(offer_id);
   conditions.push(`ps.offer_id = $${values.length}`);
  }

  const whereClause =
   conditions.length > 0
    ? "WHERE " + conditions.join(" AND ")
    : "";

  const query = `

SELECT

DATE(ps.created_at) as date,

a.advertiser_name,
o.offer_name,
p.publisher_name,

ps.geo,
ps.carrier,

o.payout as cpa,
o.cap,

/* PIN REQUEST */

COUNT(*) FILTER (
WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
) as pin_req,

COUNT(DISTINCT ps.msisdn) FILTER (
WHERE ps.status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
) as unique_req,

/* PIN SENT */

COUNT(*) FILTER (WHERE ps.status='OTP_SENT') as pin_sent,

COUNT(DISTINCT ps.msisdn) FILTER (
WHERE ps.status='OTP_SENT'
) as unique_sent,

/* VERIFY */

COUNT(*) FILTER (
WHERE ps.status='VERIFY_REQUESTED'
) as verify_req,

COUNT(DISTINCT ps.msisdn) FILTER (
WHERE ps.status='VERIFY_REQUESTED'
) as unique_verify,

/* VERIFIED */

COUNT(*) FILTER (
WHERE ps.status='VERIFIED'
) as verified,

/* CR */

ROUND(
COUNT(*) FILTER (WHERE ps.status='VERIFIED')::numeric /
NULLIF(
COUNT(*) FILTER (WHERE ps.status='OTP_SENT'),0
) * 100
,2) as cr_percent,

/* REVENUE */

ROUND(
COUNT(*) FILTER (WHERE ps.status='VERIFIED') * o.payout
,2) as revenue,

/* LAST EVENTS */

MAX(ps.created_at) FILTER (
WHERE ps.status='OTP_SENT'
) as last_pin_gen,

MAX(ps.created_at) FILTER (
WHERE ps.status='OTP_SENT'
) as last_pin_gen_success,

MAX(ps.created_at) FILTER (
WHERE ps.status='VERIFY_REQUESTED'
) as last_verification,

MAX(ps.created_at) FILTER (
WHERE ps.status='VERIFIED'
) as last_success_verification

FROM pin_sessions ps

JOIN offers o
ON o.id = ps.offer_id

JOIN advertisers a
ON a.id = o.advertiser_id

JOIN publishers p
ON p.id = ps.publisher_id

${whereClause}

GROUP BY
DATE(ps.created_at),
a.advertiser_name,
o.offer_name,
p.publisher_name,
ps.geo,
ps.carrier,
o.payout,
o.cap

ORDER BY date DESC

`;

  const result = await pool.query(query, values);

  res.json({
   status: "success",
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
REALTIME DASHBOARD STATS
=====================================================
*/

router.get("/dashboard/realtime", async (req, res) => {

 try {

  const stats = await pool.query(`

SELECT

COUNT(*) FILTER (
WHERE status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
) as total_requests,

COUNT(*) FILTER (
WHERE status='OTP_SENT'
) as otp_sent,

COUNT(*) FILTER (
WHERE status='VERIFIED'
) as conversions,

COUNT(*) FILTER (
WHERE created_at >= NOW() - INTERVAL '1 hour'
) as last_hour_requests

FROM pin_sessions

`);

  res.json({
   status: "success",
   data: stats.rows[0]
  });

 } catch (err) {

  console.error("REALTIME ERROR:", err);

  res.status(500).json({
   status: "FAILED"
  });

 }

});

export default router;
