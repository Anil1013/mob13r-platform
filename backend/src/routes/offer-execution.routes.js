const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const db = require("../db");

const buildPayload = require("../utils/buildPayload");
const executeApi = require("../utils/executeApi");
const templateEngine = require("../utils/templateEngine");

/* =====================================================
   INTERNAL EXECUTOR
===================================================== */
async function runStep({ offer, stepKey, req, res }) {
  const step = offer.api_steps?.[stepKey];

  if (!step || !step.enabled) {
    return res.status(400).json({
      success: false,
      error: `Step "${stepKey}" not enabled`,
    });
  }

  try {
    const context = {
      msisdn: req.body.msisdn,
      pin: req.body.pin,
      ip: req.ip,
      user_ip: req.body.user_ip || req.ip,
      ua: req.headers["user-agent"],
      ...req.body,
    };

    const headers = buildPayload(step.headers, context);
    const params = buildPayload(step.params, context);
    const url = templateEngine(step.url, context);

    const result = await executeApi({
      method: step.method,
      url,
      headers,
      params,
      successMatcher: step.success_matcher,
    });

    await db.query(
      `
      INSERT INTO offer_execution_logs
      (offer_id, step, status, request_payload, response_payload)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        offer.id,
        stepKey,
        result.success ? "success" : "failed",
        { url, headers, params },
        result.response,
      ]
    );

    res.json({
      success: result.success,
      response: result.response,
      redirect_url:
        stepKey === "pin_verify"
          ? offer.redirect_url
          : undefined,
    });
  } catch (err) {
    console.error("Execution error:", err);

    await db.query(
      `
      INSERT INTO offer_execution_logs
      (offer_id, step, status, request_payload, error)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        offer.id,
        stepKey,
        "failed",
        req.body,
        err.message,
      ]
    );

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

/* =====================================================
   LOAD OFFER
===================================================== */
async function loadOffer(req, res, next) {
  const { id } = req.params;
  const { rows } = await db.query(
    `SELECT * FROM offers WHERE id = $1`,
    [id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Offer not found" });
  }

  req.offer = rows[0];
  next();
}

/* =====================================================
   ROUTES
===================================================== */
router.post("/:id/status-check", auth, loadOffer, (req, res) =>
  runStep({ offer: req.offer, stepKey: "status_check", req, res })
);

router.post("/:id/pin-send", auth, loadOffer, (req, res) =>
  runStep({ offer: req.offer, stepKey: "pin_send", req, res })
);

router.post("/:id/pin-verify", auth, loadOffer, (req, res) =>
  runStep({ offer: req.offer, stepKey: "pin_verify", req, res })
);

router.post("/:id/anti-fraud", auth, loadOffer, (req, res) =>
  runStep({ offer: req.offer, stepKey: "anti_fraud", req, res })
);

module.exports = router;
