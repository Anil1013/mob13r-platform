export const buildContext = (req) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];

  return {
    msisdn: req.body.msisdn,
    transaction_id: req.body.transaction_id,
    uuid_trxid: crypto.randomUUID(),
    pin: req.body.pin,
    ip,
    user_ip: req.body.user_ip || ip,
    ua,
    base64_ua: Buffer.from(ua || "").toString("base64"),
    anti_fraud_id: req.body.anti_fraud_id,
    param1: req.body.param1,
    param2: req.body.param2,
  };
};

export const applyTemplate = (input, ctx) => {
  let out = JSON.stringify(input);
  Object.entries(ctx).forEach(([k, v]) => {
    out = out.replaceAll(`<coll_${k}>`, v ?? "");
    out = out.replaceAll(`<${k}>`, v ?? "");
  });
  return JSON.parse(out);
};
