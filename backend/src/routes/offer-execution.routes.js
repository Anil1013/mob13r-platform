const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const db = require("../db");

const buildPayload = require("../utils/buildPayload");
const executeApi = require("../utils/executeApi");
const templateEngine = require("../utils/templateEngine");

/**
 * OFFER EXECUTION ROUTES
 *
 * Handles:
 * - status-check
 * - pin-send
 * - pin-verify
 * - anti-fraud (optional)
 *
 * Flow:
 * 1. Load offer + api_steps
 * 2. Build headers / params using <coll_xxx>
 * 3. Execute external API
 * 4. Store execution logs
 */

/* =====================================================
   INTERNAL HELPER: EXECUTE STEP
===================================================== */
async function runStep({ offer, stepKey, req, res }) {
  const step = offer.api_steps?.[stepKey];

  if (!step || !step.enabled) {
    return res.status(400).json({
      success: false,
      error: `Step "${stepKey}" is not enabled`,
    });
  }

  try {
    /* ================= BUILD CONTEXT ================= */
    const context = {
      msisdn: req.body.msisdn,
      pin: req.body.pin,
      transaction_id:
        req.body.transaction_id ||
        req.body.sessionKey ||
        null,
      ip: req.ip,
      user_ip: req.body.user_ip || req.ip,
      ua: req.headers["user-agent"],
      ...req.body, // param1, param2, cid, etc
    };

    /* ================= BUILD PAYLOAD ================= */
    const headers = buildPayload(step.headers, context);
    const params = buildPayload(step.params, context);

    const url = templateEngine(step.url, context);

    /* ================= EXECUTE API ================= */
    const result = await executeApi({
      method: step.method,
      url,
      headers,
      params,
      successMatcher: step.success_matcher,
    });

    /* ================= SAVE LOG ================= */
    await db.query(
      `
      INSERT INTO execution_logs
        (offer_id, step, status, transaction_id, request_payload, response_payload)
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        offer.id,
        stepKey,
        result.success ? "success" : "failed",
        context.transaction_id,
        { headers, params, url },
        result.response,
      ]
    );

    /* ================= RESPONSE ================= */
    res.json({
      success: result.success,
      response: result.response,
      transaction_id:
        context.transaction_id ||
        result.response?.transaction_id ||
        result.response?.sessionKey ||
        null,
      redirect_url:
        stepKey === "pin_verify"
          ? offer.redirect_url
          : undefined,
    });
  } catch (err) {
    console.error(`Execution error [${stepKey}]`, err);

    await db.query(
      `
      INSERT INTO execution_logs
        (offer_id, step, status, transaction_id, request_payload, error)
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [
        offer.id,
        stepKey,
        "failed",
        req.body.transaction_id || null,
        req.body,
        err.message,
      ]
    );

    res.status(500).json({
      success: false,
      error: err.message || "Execution failed",
    });
  }
}

/* =====================================================
   LOAD OFFER MIDDLEWARE
===================================================== */
async function loadOffer(req, res, next) {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT * FROM offers WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    req.offer = rows[0];
    next();
  } catch (err) {
    console.error("Load offer error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to load offer",
    });
  }
}

/* =====================================================
   ROUTES
===================================================== */

/* ================= STATUS CHECK ================= */
router.post(
  "/:id/status-check",
  auth,
  loadOffer,
  (req, res) =>
    runStep({
      offer: req.offer,
      stepKey: "status_check",
      req,
      res,
    })
);

/* ================= PIN SEND ================= */
router.post(
  "/:id/pin-send",
  auth,
  loadOffer,
  (req, res) =>
    runStep({
      offer: req.offer,
      stepKey: "pin_send",
      req,
      res,
    })
);

/* ================= PIN VERIFY ================= */
router.post(
  "/:id/pin-verify",
  auth,
  loadOffer,
  (req, res) =>
    runStep({
      offer: req.offer,
      stepKey: "pin_verify",
      req,
      res,
    })
);

/* ================= ANTI-FRAUD (OPTIONAL) ================= */
router.post(
  "/:id/anti-fraud",
  auth,
  loadOffer,
  (req, res) =>
    runStep({
      offer: req.offer,
      stepKey: "anti_fraud",
      req,
      res,
    })
);

module.exports = router;
