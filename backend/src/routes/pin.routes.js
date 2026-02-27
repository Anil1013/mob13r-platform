import express from "express";
import pool from "../db.js";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import {
  mapPinSendResponse,
  mapPinVerifyResponse,
} from "../services/advResponseMapper.js";

import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

const AXIOS_TIMEOUT = 30000;

/* =====================================================
   HELPERS
===================================================== */

function captureHeaders(req) {
  return {
    "user-agent": req.headers["user-agent"] || "",
    "x-forwarded-for": req.headers["x-forwarded-for"] || "",
  };
}

function safeSessionKey(data) {
  return (
    data?.sessionKey ||
    data?.session_key ||
    data?.transactionId ||
    data?.txnId ||
    null
  );
}

/* =====================================================
   PIN SEND
===================================================== */

router.all("/pin/send/:offer_id", async (req, res) => {

  try {

    const incoming = { ...req.query, ...req.body };
    const { msisdn } = incoming;
    const { offer_id } = req.params;

    if (!msisdn)
      return res.json({ status: "FAILED" });

    /* ================= OFFER ================= */

    const offerRes = await pool.query(
      `SELECT * FROM offers WHERE id=$1 AND status='active'`,
      [offer_id]
    );

    if (!offerRes.rows.length)
      return res.json({ status: "FAILED" });

    const offer = offerRes.rows[0];
    const sessionToken = uuidv4();

    /* ================= ROUTES ================= */

    const routes = await pool.query(
      `SELECT id
       FROM offer_advertiser_routes
       WHERE offer_id=$1
       AND status='active'
       ORDER BY priority ASC`,
      [offer.id]
    );

    let advMapped = null;
    let advertiserReq = null;
    let advertiserRes = null;
    let advSessionKey = null;
    let usedRoute = null;
    let runtimeParams = {};

    /* ================= FALLBACK ================= */

    for (const r of routes.rows) {

      let paramsRes = await pool.query(
        `SELECT param_key,param_value
         FROM offer_route_parameters
         WHERE route_id=$1`,
        [r.id]
      );

      if (!paramsRes.rows.length) {
        paramsRes = await pool.query(
          `SELECT param_key,param_value
           FROM offer_parameters
           WHERE offer_id=$1`,
          [offer.id]
        );
      }

      const params = {};
      paramsRes.rows.forEach(
        p => params[p.param_key] = p.param_value
      );

      const url = params.pin_send_url;
      if (!url) continue;

      const method =
        (params.method || "GET").toUpperCase();

      runtimeParams = {
        ...params,
        ...incoming,
      };

      advertiserReq = {
        url,
        method,
        params: method === "GET" ? runtimeParams : null,
        body: method === "POST" ? runtimeParams : null,
      };

      try {

        const resp =
          method === "POST"
            ? await axios.post(url, runtimeParams,{timeout:AXIOS_TIMEOUT})
            : await axios.get(url,{params:runtimeParams,timeout:AXIOS_TIMEOUT});

        advertiserRes = resp.data || {};

        advMapped = mapPinSendResponse(advertiserRes);
        advSessionKey = safeSessionKey(advertiserRes);

        if (advMapped.isSuccess) {
          usedRoute = r.id;
          break;
        }

      } catch (err) {
        advertiserRes =
          err?.response?.data || { error: "request_failed" };
      }
    }

    /* ================= SESSION SAVE ================= */

    await pool.query(
      `INSERT INTO pin_sessions
      (offer_id,msisdn,session_token,params,
       route_id,adv_session_key,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        offer.id,
        msisdn,
        sessionToken,
        runtimeParams,
        usedRoute,
        advSessionKey,
        advMapped?.isSuccess ? "OTP_SENT":"OTP_FAILED"
      ]
    );

    const publisherResponse =
      mapPublisherResponse({
        ...(advMapped?.body || {}),
        session_token: sessionToken,
      });

    /* ================= LOG INSERT ================= */

    await pool.query(
      `INSERT INTO pin_transaction_logs
      (session_token,event_type,
       publisher_request,
       advertiser_request,
       advertiser_response,
       publisher_response,
       status)
       VALUES ($1,'PIN_SEND',$2,$3,$4,$5,$6)`,
      [
        sessionToken,
        {
          url:req.originalUrl,
          headers:captureHeaders(req),
          params:incoming
        },
        advertiserReq,
        advertiserRes,
        publisherResponse,
        advMapped?.isSuccess ? "OTP_SENT":"OTP_FAILED"
      ]
    );

    return res.json(publisherResponse);

  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res.json({ status:"FAILED" });
  }
});


/* =====================================================
   PIN VERIFY
===================================================== */

router.all("/pin/verify", async (req,res)=>{

try{

const {session_token,otp}={
...req.query,
...req.body
};

if(!session_token||!otp)
return res.json({status:"FAILED"});

const sRes=await pool.query(
`SELECT * FROM pin_sessions WHERE session_token=$1`,
[session_token]
);

if(!sRes.rows.length)
return res.json({status:"INVALID_SESSION"});

const session=sRes.rows[0];

/* ===== LOAD SAME ROUTE ===== */

let paramsRes=await pool.query(
`SELECT param_key,param_value
 FROM offer_route_parameters
 WHERE route_id=$1`,
[session.route_id]
);

if(!paramsRes.rows.length){
paramsRes=await pool.query(
`SELECT param_key,param_value
 FROM offer_parameters
 WHERE offer_id=$1`,
[session.offer_id]
);
}

const params={};
paramsRes.rows.forEach(
p=>params[p.param_key]=p.param_value
);

const verifyUrl=params.verify_pin_url;
const verifyMethod=
(params.verify_method||"GET").toUpperCase();

const payload={
...session.params,
otp
};

if(session.adv_session_key)
payload.sessionKey=session.adv_session_key;

const advertiserReq={
url:verifyUrl,
method:verifyMethod,
params:verifyMethod==="GET"?payload:null,
body:verifyMethod==="POST"?payload:null
};

let advData={};

try{
const resp=
verifyMethod==="POST"
?await axios.post(verifyUrl,payload)
:await axios.get(verifyUrl,{params:payload});

advData=resp.data||{};
}catch(e){
advData=e?.response?.data||{};
}

const advMapped=
mapPinVerifyResponse(advData);

const publisherResponse=
mapPublisherResponse({
...advMapped.body,
session_token
});

/* ✅ UPDATE ONLY STATUS */

await pool.query(
`UPDATE pin_sessions
 SET status=$1,
 verified_at=
 CASE WHEN $1='VERIFIED'
 THEN NOW()
 ELSE verified_at END
 WHERE session_token=$2`,
[
advMapped.isSuccess?"VERIFIED":"OTP_FAILED",
session_token
]
);

/* ✅ VERIFY LOG ROW */

await pool.query(
`INSERT INTO pin_transaction_logs
(session_token,event_type,
publisher_request,
advertiser_request,
advertiser_response,
publisher_response,
status)
VALUES ($1,'PIN_VERIFY',$2,$3,$4,$5,$6)`,
[
session_token,
{
url:req.originalUrl,
params:{otp}
},
advertiserReq,
advData,
publisherResponse,
advMapped.isSuccess?"VERIFIED":"OTP_FAILED"
]
);

return res.json(publisherResponse);

}catch(err){
console.error("VERIFY ERROR:",err);
return res.json({status:"FAILED"});
}

});

export default router;
