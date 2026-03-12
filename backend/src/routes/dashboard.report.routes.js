import express from "express";
import pool from "../db.js";
import { Parser } from "json2csv";

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

  if (from) {
   values.push(from);
   conditions.push(`ps.created_at >= $${values.length}`);
  }

  if (to) {
   values.push(to);
   conditions.push(`ps.created_at <= $${values.length}`);
  }

  if (operator) {
   values.push(operator);
   conditions.push(`ps.carrier = $${values.length}`);
  }

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

COUNT(*) FILTER (WHERE ps.status='OTP_REQUESTED') as pin_req,

COUNT(DISTINCT ps.msisdn)
FILTER (WHERE ps.status='OTP_REQUESTED') as unique_req,

COUNT(*) FILTER (WHERE ps.status='OTP_SENT') as pin_sent,

COUNT(DISTINCT ps.msisdn)
FILTER (WHERE ps.status='OTP_SENT') as unique_sent,

COUNT(*) FILTER (WHERE ps.status='VERIFY_REQUESTED') as verify_req,

COUNT(DISTINCT ps.msisdn)
FILTER (WHERE ps.status='VERIFY_REQUESTED') as unique_verify,

COUNT(*) FILTER (WHERE ps.status='VERIFIED') as verified,

ROUND(
COUNT(*) FILTER (WHERE ps.status='VERIFIED')::numeric /
NULLIF(
COUNT(*) FILTER (WHERE ps.status='OTP_SENT'),0
)*100,2
) as cr_percent,

COUNT(*) FILTER (WHERE ps.status='VERIFIED') * o.payout as revenue,

MAX(ps.created_at)
FILTER (WHERE ps.status='OTP_REQUESTED') as last_pin_gen,

MAX(ps.created_at)
FILTER (WHERE ps.status='OTP_SENT') as last_pin_gen_success,

MAX(ps.created_at)
FILTER (WHERE ps.status='VERIFY_REQUESTED') as last_verification,

MAX(ps.created_at)
FILTER (WHERE ps.status='VERIFIED') as last_success_verification

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

  console.error(err);

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

COUNT(*) FILTER (WHERE status='OTP_REQUESTED')
as total_requests,

COUNT(*) FILTER (WHERE status='OTP_SENT')
as otp_sent,

COUNT(*) FILTER (WHERE status='VERIFIED')
as conversions,

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

  console.error(err);

  res.status(500).json({
   status: "FAILED"
  });

 }

});


/*
=====================================================
EXPORT CSV REPORT
=====================================================
*/

router.get("/dashboard/export/csv", async (req, res) => {

 try {

  const result = await pool.query(`
SELECT * FROM pin_sessions
`);

  const parser = new Parser();

  const csv = parser.parse(result.rows);

  res.header("Content-Type", "text/csv");

  res.attachment("traffic_report.csv");

  res.send(csv);

 } catch (err) {

  console.error(err);

  res.status(500).json({
   status: "FAILED"
  });

 }

});

export default router;
