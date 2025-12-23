import { Router } from "express";
import crypto from "crypto";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

/* =====================================================
   HELPER: BUILD PAYLOAD (PARAM WHITELIST + EXTRA)
===================================================== */
function buildPayload(allowedParams = [], source = {}, extra = {}) {
  const payload = {};

  allowedParams.forEach((key) => {
    if (source[key] !== undefined) {
      payload[key] = source[key];
    }
  });

  return { ...payload, ...extra };
}

/* =====================================================
   HELPER: EXECUTE API CALL
===================================================== */
async function executeApi({ method, url, payload }) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (method === "POST") {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(url, options);
  return response.json();
}

/* =====================================================
   COMMON: LOAD OFFER
===================================================== */
async function loadOffer(offerId) {
  const { rows } = await pool.query(
    "SELECT * FROM offers WHERE id = $1",
    [offerId]
  );
  return rows[0];
}

/* =====================================================
   STEP 1: STATUS CHECK
===================================================== */
router.post("/:id/status-check", async (req, res) => {
  const offerId = req.params.id;

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const transaction_id =
    req.body.transaction_id || crypto.randomUUID();

  try {
    const offer = await loadOffer(offerId);
    if (!offer)
      return res.status(404).json({ message: "Offer not found" });

    const payload = buildPayload(
      ["msisdn", "transaction_id"],
      { ...req.body, transaction_id },
      { ip, ua }
    );

    const response = await executeApi({
      method: offer.api_mode,
      url: offer.status_check_url,
      payload,
    });

    const status =
      response?.status === "OK" || response?.success
        ? "success"
        : "failed";

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, step, transaction_id, request_payload, response_payload, status)
      VALUES ($1,'status_check',$2,$3,$4,$5)
      `,
      [offerId, transaction_id, payload, response, status]
    );

    res.json({ transaction_id, response });
  } catch (err) {
    console.error("STATUS CHECK ERROR:", err);

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, step, transaction_id, request_payload, status, error)
      VALUES ($1,'status_check',$2,$3,'failed',$4)
      `,
      [offerId, transaction_id, req.body, err.message]
    );

    res.status(500).json({ message: "Status check failed" });
  }
});

/* =====================================================
   STEP 2: PIN SEND
===================================================== */
router.post("/:id/pin-send", async (req, res) => {
  const offerId = req.params.id;

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const transaction_id =
    req.body.transaction_id || crypto.randomUUID();

  try {
    const offer = await loadOffer(offerId);
    if (!offer)
      return res.status(404).json({ message: "Offer not found" });

    const payload = buildPayload(
      offer.pin_send_params || [],
      { ...req.body, transaction_id },
      { ip, ua }
    );

    const response = await executeApi({
      method: offer.api_mode,
      url: offer.pin_send_url,
      payload,
    });

    const status =
      response?.status === "OK" || response?.success
        ? "success"
        : "failed";

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, step, transaction_id, request_payload, response_payload, status)
      VALUES ($1,'pin_send',$2,$3,$4,$5)
      `,
      [offerId, transaction_id, payload, response, status]
    );

    res.json({ transaction_id, response });
  } catch (err) {
    console.error("PIN SEND ERROR:", err);

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, step, transaction_id, request_payload, status, error)
      VALUES ($1,'pin_send',$2,$3,'failed',$4)
      `,
      [offerId, transaction_id, req.body, err.message]
    );

    res.status(500).json({ message: "PIN send failed" });
  }
});

/* =====================================================
   STEP 3: PIN VERIFY
===================================================== */
router.post("/:id/pin-verify", async (req, res) => {
  const offerId = req.params.id;

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const transaction_id =
    req.body.transaction_id || crypto.randomUUID();

  try {
    const offer = await loadOffer(offerId);
    if (!offer)
      return res.status(404).json({ message: "Offer not found" });

    const payload = buildPayload(
      offer.pin_verify_params || [],
      { ...req.body, transaction_id },
      { ip, ua }
    );

    const response = await executeApi({
      method: offer.api_mode,
      url: offer.pin_verify_url,
      payload,
    });

    const status =
      response?.status === "OK" || response?.success
        ? "success"
        : "failed";

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, step, transaction_id, request_payload, response_payload, status)
      VALUES ($1,'pin_verify',$2,$3,$4,$5)
      `,
      [offerId, transaction_id, payload, response, status]
    );

    res.json({ transaction_id, response });
  } catch (err) {
    console.error("PIN VERIFY ERROR:", err);

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, step, transaction_id, request_payload, status, error)
      VALUES ($1,'pin_verify',$2,$3,'failed',$4)
      `,
      [offerId, transaction_id, req.body, err.message]
    );

    res.status(500).json({ message: "PIN verify failed" });
  }
});

export default router;
