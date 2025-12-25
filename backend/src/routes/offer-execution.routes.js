import { Router } from "express";
import crypto from "crypto";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

/* =====================================================
   TEMPLATE MAP
===================================================== */
const buildContext = (req) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];

  return {
    msisdn: req.body.msisdn,
    transaction_id: req.body.transaction_id || crypto.randomUUID(),
    pin: req.body.pin,
    ip,
    user_ip: req.body.user_ip || req.body.ip || ip,
    ua,
    param1: req.body.param1,
    param2: req.body.param2,
    anti_fraud_id: req.body.anti_fraud_id,
  };
};

const applyTemplates = (obj = {}, ctx) => {
  const out = {};
  for (const k in obj) {
    let v = obj[k];
    if (typeof v === "string") {
      Object.entries(ctx).forEach(([key, value]) => {
        v = v.replaceAll(`<coll_${key}>`, value ?? "");
        v = v.replaceAll(`<${key}>`, value ?? "");
      });
    }
    out[k] = v;
  }
  return out;
};

const executeStep = async (step, ctx) => {
  const params = applyTemplates(step.params || {}, ctx);
  const headers = applyTemplates(step.headers || {}, ctx);

  if (step.method === "GET") {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${step.url}?${qs}`, { headers });
    return res.json();
  }

  const res = await fetch(step.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(params),
  });

  return res.json();
};

const loadOffer = async (id) => {
  const { rows } = await pool.query("SELECT * FROM offers WHERE id = $1", [id]);
  return rows[0];
};

/* =====================================================
   EXECUTE STEP (GENERIC)
===================================================== */
router.post("/:id/:step", async (req, res) => {
  try {
    const offer = await loadOffer(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const apiSteps = offer.api_steps || {};
    const step = apiSteps[req.params.step];

    if (!step || step.enabled === false) {
      return res.status(400).json({ message: "Step disabled or not configured" });
    }

    const ctx = buildContext(req);
    const response = await executeStep(step, ctx);

    const success =
      step.success_matcher
        ? JSON.stringify(response).includes(step.success_matcher)
        : true;

    res.json({
      transaction_id: ctx.transaction_id,
      success,
      response,
      redirect_url: success ? offer.redirect_url : null,
    });
  } catch (err) {
    console.error("EXECUTION ERROR:", err);
    res.status(500).json({ message: "Execution failed" });
  }
});

export default router;
