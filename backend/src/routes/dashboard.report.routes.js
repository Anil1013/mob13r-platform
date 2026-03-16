import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/dashboard/report", async (req,res)=>{

 try{

 const {from,to,geo,carrier,publisher,offer_id,advertiser} = req.query;

 let conditions = [];
 let values = [];

 if(from){
  values.push(from);
  conditions.push(`ps.created_at >= $${values.length}`);
 }

 if(to){
  values.push(to);
  conditions.push(`ps.created_at <= $${values.length}`);
 }

 if(geo){
  values.push(geo);
  conditions.push(`ps.params->>'geo' = $${values.length}`);
 }

 if(carrier){
  values.push(carrier);
  conditions.push(`ps.params->>'carrier' = $${values.length}`);
 }

 if(publisher){
  values.push(publisher);
  conditions.push(`ps.publisher_id = $${values.length}`);
 }

 if(offer_id){
  values.push(offer_id);
  conditions.push(`ps.offer_id = $${values.length}`);
 }

 if(advertiser){
  values.push(advertiser);
  conditions.push(`o.advertiser_id = $${values.length}`);
 }

 const where =
  conditions.length>0
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

COUNT(*) FILTER (WHERE ps.status='VERIFIED') * o.cpa AS revenue,

MAX(ps.created_at)
FILTER (WHERE ps.status='OTP_SENT') AS last_pin_gen,

MAX(ps.created_at)
FILTER (WHERE ps.parent_session_token IS NOT NULL) AS last_verification,

MAX(ps.created_at)
FILTER (WHERE ps.status='VERIFIED') AS last_success_verification

FROM pin_sessions ps

LEFT JOIN offers o
ON o.id = ps.offer_id

LEFT JOIN publishers p
ON p.id = ps.publisher_id

LEFT JOIN advertisers a
ON a.id = o.advertiser_id

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

 const result = await pool.query(query,values);

 res.json({
  status:"SUCCESS",
  data:result.rows
 });

 }catch(err){

 console.error(err);

 res.status(500).json({
  status:"FAILED"
 });

 }

});

export default router;
