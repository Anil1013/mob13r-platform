import { Router } from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";
import { buildContext, applyTemplate } from "../utils/templateEngine.js";

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
    const offer = await loadOffer(req.params.id);
    if (!offer)
      return res.status(404).json({ message: "Offer not found" });

    const apiSteps = offer.api_steps || {};
    const stepConfig = apiSteps[req.params.step];

    if (!stepConfig || stepConfig.enabled === false) {
      return res.status(400).json({
        message: "Step disabled or not configured",
      });
    }

    /* BUILD RUNTIME CONTEXT */
    const ctx = buildContext(req);

    /* AUTO ANTI-FRAUD */
    if (
      apiSteps.anti_fraud &&
      apiSteps.anti_fraud.enabled &&
      req.params.step !== "anti_fraud"
    ) {
      await executeStep(apiSteps.anti_fraud, ctx);
    }

    /* EXECUTE STEP */
    const response = await executeStep(stepConfig, ctx);

    /* SUCCESS MATCHING */
    let success = true;
    if (stepConfig.success_matcher) {
      const matcher = stepConfig.success_matcher;

      if (typeof matcher === "string") {
        success = JSON.stringify(response).includes(matcher);
      } else if (typeof matcher === "object") {
        success = Object.entries(matcher).every(
          ([k, v]) => response?.[k] === v
        );
      }
    }

    res.json({
      transaction_id: ctx.transaction_id,
      step: req.params.step,
      success,
      response,
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
