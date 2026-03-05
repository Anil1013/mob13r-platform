import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  mapPinSendResponse,
  mapPinVerifyResponse
} from "../services/advResponseMapper.js";

import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ===================================================== */

const AXIOS_TIMEOUT = 30000;
const MAX_MSISDN_DAILY = 7;

/* ===================================================== */

function captureHeaders(req){
return{
"user-agent":req.headers["user-agent"]||"",
"x-forwarded-for":
req.headers["x-forwarded-for"]||
req.socket.remoteAddress||
""
};
}

function safeSessionKey(data){
return(
data?.sessionKey||
data?.session_key||
data?.transactionId||
null
);
}

/* =====================================================
Publisher validation
===================================================== */

async function validatePublisher(req){

const apiKey=
req.headers["x-api-key"]||
req.query["x-api-key"];

if(!apiKey) return null;

const r=await pool.query(
`SELECT * FROM publishers
WHERE api_key=$1
AND status='active'
LIMIT 1`,
[apiKey]
);

return r.rows[0]||null;
}

/* =====================================================
MSISDN limit
===================================================== */

async function isMsisdnLimitReached(msisdn){

const r=await pool.query(
`SELECT COUNT(*)
FROM pin_sessions
WHERE msisdn=$1
AND created_at::date=CURRENT_DATE`,
[msisdn]
);

return Number(r.rows[0].count)>=MAX_MSISDN_DAILY;
}

/* =====================================================
Advertiser call (primary + fallback)
===================================================== */

async function callAdvertiser(url,fallback,method,payload){

try{

const resp=
method==="POST"
? await axios.post(url,payload,{timeout:AXIOS_TIMEOUT})
: await axios.get(url,{params:payload,timeout:AXIOS_TIMEOUT});

return{response:resp,used:url,method};

}catch(e){

console.log("PRIMARY ADV ERROR:",e.message);

if(!fallback){

return{
response:{data:e?.response?.data||{error:"primary failed"}},
used:url,
method
};

}

try{

const resp=
method==="POST"
? await axios.post(fallback,payload,{timeout:AXIOS_TIMEOUT})
: await axios.get(fallback,{params:payload,timeout:AXIOS_TIMEOUT});

return{response:resp,used:fallback,method};

}catch(e2){

console.log("FALLBACK ADV ERROR:",e2.message);

return{
response:{data:e2?.response?.data||{error:"fallback failed"}},
used:fallback,
method
};

}

}

}

/* =====================================================
PIN SEND
===================================================== */

router.all("/pin/send/:offer_id",async(req,res)=>{

try{

const publisher=await validatePublisher(req);

if(!publisher)
return res.status(401).json({status:"INVALID_KEY"});

const {offer_id}=req.params;

const incoming={...req.query,...req.body};

const {msisdn}=incoming;

if(!msisdn)
return res.status(400).json({status:"FAILED"});

if(await isMsisdnLimitReached(msisdn))
return res.status(429).json({status:"BLOCKED"});

/* OFFER */

const offerRes=await pool.query(
`SELECT * FROM offers
WHERE id=$1 AND status='active'`,
[offer_id]
);

if(!offerRes.rows.length)
return res.status(404).json({status:"FAILED"});

const offer=offerRes.rows[0];

/* PARAMETERS */

const paramRes=await pool.query(
`SELECT param_key,param_value
FROM offer_parameters
WHERE offer_id=$1`,
[offer.id]
);

const params={};

paramRes.rows.forEach(
p=>params[p.param_key]=p.param_value
);

/* FINAL PARAMS */

const finalParams={
...params,
...incoming
};

const sessionToken=uuidv4();

/* INSERT SESSION */

await pool.query(
`INSERT INTO pin_sessions
(offer_id,
msisdn,
session_token,
params,
publisher_request,
publisher_id,
status)
VALUES ($1,$2,$3,$4,$5,$6,'OTP_REQUESTED')`,
[
offer.id,
msisdn,
sessionToken,
finalParams,
{
url:req.originalUrl,
method:req.method,
headers:captureHeaders(req),
params:incoming
},
publisher.id
]
);

/* ADVERTISER CALL */

const advCall=await callAdvertiser(
params.pin_send_url,
params.pin_send_fallback_url,
(params.method||"GET").toUpperCase(),
finalParams
);

const advResp=advCall.response;

const advertiserResponse=advResp?.data||{};

/* MAP */

let advMapped;

try{
advMapped=mapPinSendResponse(advertiserResponse);
}catch(e){

console.log("SEND MAP ERROR:",e.message);

advMapped={
isSuccess:false,
body:{status:"FAILED"}
};

}

/* PUBLISHER RESPONSE */

const publisherResponse=
mapPublisherResponse({
...advMapped.body,
session_token:sessionToken
});

/* UPDATE SESSION */

await pool.query(
`UPDATE pin_sessions
SET advertiser_request=$1,
advertiser_response=$2,
publisher_response=$3,
adv_session_key=$4,
status=$5
WHERE session_token=$6`,
[
{
url:advCall.used,
method:advCall.method,
payload:finalParams
},
advertiserResponse,
publisherResponse,
safeSessionKey(advertiserResponse),
advMapped.isSuccess
? "OTP_SENT"
: "OTP_FAILED",
sessionToken
]
);

return res.json(publisherResponse);

}catch(err){

console.error("PIN SEND ERROR:",err);

return res.status(500).json({status:"FAILED"});

}

});

/* =====================================================
PIN VERIFY
===================================================== */

router.all("/pin/verify",async(req,res)=>{

try{

const publisher=await validatePublisher(req);

if(!publisher)
return res.status(401).json({status:"INVALID_KEY"});

const {session_token,otp}={
...req.query,
...req.body
};

if(!session_token||!otp)
return res.json({status:"FAILED"});

/* ORIGINAL SESSION */

const sRes=await pool.query(
`SELECT * FROM pin_sessions
WHERE session_token=$1`,
[session_token]
);

if(!sRes.rows.length)
return res.json({status:"INVALID_SESSION"});

const session=sRes.rows[0];

/* OFFER PARAMS */

const paramRes=await pool.query(
`SELECT param_key,param_value
FROM offer_parameters
WHERE offer_id=$1`,
[session.offer_id]
);

const params={};

paramRes.rows.forEach(
p=>params[p.param_key]=p.param_value
);

/* VERIFY PAYLOAD */

const payload={
...session.params,
otp,
sessionKey:session.adv_session_key
};

const verifySessionToken=uuidv4();

/* INSERT VERIFY ROW */

await pool.query(
`INSERT INTO pin_sessions
(offer_id,
msisdn,
session_token,
parent_session_token,
params,
publisher_request,
publisher_id,
status)
VALUES ($1,$2,$3,$4,$5,$6,$7,'VERIFY_REQUESTED')`,
[
session.offer_id,
session.msisdn,
verifySessionToken,
session_token,
payload,
{
url:req.originalUrl,
method:req.method,
headers:captureHeaders(req),
params:payload
},
session.publisher_id
]
);

/* SAVE REQUEST */

await pool.query(
`UPDATE pin_sessions
SET advertiser_request=$1
WHERE session_token=$2`,
[
{
url:params.verify_pin_url,
method:params.verify_method||"GET",
payload
},
verifySessionToken
]
);

/* CALL ADVERTISER */

let advertiserResponse={};
let advMapped={isSuccess:false,body:{status:"FAILED"}};

try{

const advCall=await callAdvertiser(
params.verify_pin_url,
params.verify_fallback_url,
(params.verify_method||"GET").toUpperCase(),
payload
);

advertiserResponse=
advCall?.response?.data||{};

try{

advMapped=
mapPinVerifyResponse(advertiserResponse);

}catch(e){

console.log("VERIFY MAP ERROR:",e.message);

}

}catch(e){

console.log("VERIFY ADV ERROR:",e.message);

advertiserResponse={
error:"Advertiser call failed"
};

}

/* PUBLISHER RESPONSE */

const publisherResponse=
mapPublisherResponse({
...advMapped.body,
session_token:verifySessionToken
});

/* FINAL UPDATE */

await pool.query(
`UPDATE pin_sessions
SET advertiser_response=$1,
publisher_response=$2,
status=$3,
verified_at=
CASE WHEN $3='VERIFIED'
THEN NOW()
ELSE verified_at END
WHERE session_token=$4`,
[
advertiserResponse,
publisherResponse,
advMapped.isSuccess
? "VERIFIED"
: "OTP_FAILED",
verifySessionToken
]
);

return res.json(publisherResponse);

}catch(err){

console.error("PIN VERIFY ERROR:",err);

return res.status(500).json({status:"FAILED"});

}

});

export default router;
