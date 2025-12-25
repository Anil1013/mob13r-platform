import crypto from "crypto";

/* =====================================================
   BUILD CONTEXT (RUNTIME VARIABLES)
===================================================== */
export const buildContext = (req) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.body.ip ||
    req.ip;

  const ua = req.headers["user-agent"] || "";

  return {
    /* CORE */
    msisdn: req.body.msisdn,
    transaction_id: req.body.transaction_id || crypto.randomUUID(),
    uuid_trxid: crypto.randomUUID(),
    pin: req.body.pin,

    /* NETWORK */
    ip,
    user_ip: req.body.user_ip || ip,
    ua,
    base64_ua: Buffer.from(ua).toString("base64"),

    /* DYNAMIC CAMPAIGN / OFFER */
    cid: req.body.cid,
    cmpid: req.body.cmpid,
    offid: req.body.offid,

    /* PUBLISHER FREE PARAMS */
    param1: req.body.param1,
    param2: req.body.param2,
    param3: req.body.param3,
    param4: req.body.param4,

    /* ANTI FRAUD */
    anti_fraud_id: req.body.anti_fraud_id,
  };
};

/* =====================================================
   APPLY TEMPLATE (DEEP, SAFE)
   Supports:
   <coll_msisdn>, <msisdn>, <param1>, etc
===================================================== */
export const applyTemplate = (input, ctx) => {
  if (input === null || input === undefined) return input;

  /* STRING */
  if (typeof input === "string") {
    let out = input;
    Object.entries(ctx).forEach(([k, v]) => {
      out = out.replaceAll(`<coll_${k}>`, v ?? "");
      out = out.replaceAll(`<${k}>`, v ?? "");
    });
    return out;
  }

  /* ARRAY */
  if (Array.isArray(input)) {
    return input.map((i) => applyTemplate(i, ctx));
  }

  /* OBJECT */
  if (typeof input === "object") {
    const obj = {};
    for (const k in input) {
      obj[k] = applyTemplate(input[k], ctx);
    }
    return obj;
  }

  return input;
};
