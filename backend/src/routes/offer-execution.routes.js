import { Router } from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";
import crypto from "crypto";
import { buildContext, applyTemplate } from "../utils/templateEngine.js";
import { isCapReached, incrementHit } from "../utils/capEngine.js";
import { findFallbackOffer } from "../utils/fallbackEngine.js";

const router = Router();
router.use(auth);

/* =====================================================
   SAFE FETCH (TIMEOUT PROTECTED)
===================================================== */
const safeFetch = async (url, options = {}, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(id);
  }
};

/* =====================================================
   JSON PATH RESOLVER (MINI)
===================================================== */
const getByPath = (obj, path) => {
  if (!path || typeof path !== "string") return undefined;

  return path
    .replace(/^\$\./, "")
    .split(".")
    .reduce((o, k) => (o ? o[k] : undefined), obj);
};

/* =====================================================
   APPLY RESPONSE MAPPER
===================================================== */
const applyResponseMapper = (mapper = {}, response = {}, ctx = {}) => {
  const extracted = {};

  Object.entries(mapper).forEach(([key, jsonPath]) => {
    const value = getByPath(response, jsonPath);

    if (value !== undefined) {
      ctx[key] = value;               // sessionKey
      ctx[`coll_${key}`] = value;     // legacy template
      extracted[key] = value;
    }
  });

  return extracted;
};

/* =====================================================
   EXECUTE API STEP
===================================================== */
const executeStep = async (step, ctx) => {
  const url = applyTemplate(step.url, ctx);
  const params = applyTemplate(step.params || {}, ctx);
  const headers = applyTemplate(step.headers || {}, ctx);

  if (step.method === "GET") {
    const qs = new URLSearchParams(params).toString();
    return safeFetch(`${url}?${qs}`, { headers });
  }

  return safeFetch(url, {
    method: step.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(params),
  });
};

/* =====================================================
   LOAD OFFER
===================================================== */
const loadOffer = async (id) => {
  const { rows } = await pool.query(
    "SELECT * FROM offers WHERE id = $1",
    [id]
  );
  return rows[0];
};

/* =====================================================
   GENERIC EXECUTION
   POST /api/offers/:id/:step
===================================================== */
router.post("/:id/:step", async (req, res) => {
  try {
    let offer = await loadOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    /* ================= CAP CHECK ================= */
    let fallbackUsed = false;

    if (await isCapReached(offer)) {
      const fallback = await findFallbackOffer(offer);

      if (!fallback) {
        return res.json({
          success: false,
          reason: "CAP_REACHED",
          redirect_url: null,
        });
      }

      offer = fallback;
      fallbackUsed = true;
    }

    const apiSteps = offer.api_steps || {};
    const stepConfig = apiSteps[req.params.step];

    if (!stepConfig || stepConfig.enabled === false) {
      return res.status(400).json({
        message: "Step disabled or not configured",
      });
    }

    /* ================= BUILD CONTEXT ================= */
    const ctx = buildContext(req);

    if (!ctx.transaction_id) {
      ctx.transaction_id = crypto.randomUUID();
    }

    /* ================= AUTO ANTI-FRAUD ================= */
    if (
      apiSteps.anti_fraud &&
      apiSteps.anti_fraud.enabled &&
      req.params.step !== "anti_fraud"
    ) {
      try {
        await executeStep(apiSteps.anti_fraud, ctx);
      } catch (e) {
        console.warn("Anti-fraud failed:", e.message);
      }
    }

    /* ================= EXECUTE MAIN STEP ================= */
    const response = await executeStep(stepConfig, ctx);

    /* ================= RESPONSE → CONTEXT ================= */
    let extracted = {};

    // 1️⃣ JSON PATH BASED RESPONSE MAPPER
    if (stepConfig.response_mapper) {
      extracted = applyResponseMapper(
        stepConfig.response_mapper,
        response,
        ctx
      );
    }

    // 2️⃣ AUTO FLATTEN STRING / NUMBER FIELDS
    Object.entries(response || {}).forEach(([k, v]) => {
      if (
        (typeof v === "string" || typeof v === "number") &&
        ctx[k] === undefined
      ) {
        ctx[k] = v;
        ctx[`coll_${k}`] = v;
        extracted[k] = v;
      }
    });

    /* ================= SUCCESS MATCH ================= */
    let success = true;

    if (stepConfig.success_matcher) {
      if (typeof stepConfig.success_matcher === "string") {
        success = JSON.stringify(response).includes(
          stepConfig.success_matcher
        );
      } else if (typeof stepConfig.success_matcher === "object") {
        success = Object.entries(stepConfig.success_matcher).every(
          ([k, v]) => response?.[k] === v
        );
      }
    }

    /* ================= HIT COUNT ================= */
    if (success) {
      await incrementHit(offer.id);
    }

    /* ================= FINAL RESPONSE ================= */
    res.json({
      transaction_id: ctx.transaction_id,
      step: req.params.step,
      success,
      fallbackUsed,
      response,
      extracted,                 // 👈 LIVE TEST UI USES THIS
      redirect_url: success ? offer.redirect_url : null,
    });
  } catch (err) {
    console.error("EXECUTION ERROR:", err);
    res.status(500).json({
      message: "Execution failed",
      error: err.message,
    });
  }
});

export default router;
