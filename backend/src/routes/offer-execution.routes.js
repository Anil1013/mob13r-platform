import { Router } from "express";
import crypto from "crypto";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

/* ================= HELPER: PAYLOAD ================= */
function buildPayload(allowed = [], source = {}, extra = {}) {
  const payload = {};
  allowed.forEach((k) => {
    if (source[k] !== undefined) payload[k] = source[k];
  });
  return { ...payload, ...extra };
}

/* ================= HELPER: API CALL ================= */
async function executeApi({ method, url, payload }) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (method === "POST") options.body = JSON.stringify(payload);
  const res = await fetch(url, options);
  return res.json();
}

/* ================= HELPER: LOAD OFFER ================= */
async function loadOffer(id) {
  const { rows } = await pool.query(
    "SELECT * FROM offers WHERE id = $1",
    [id]
  );
  return rows[0];
}

/* ================= STEP 1: STATUS CHECK ================= */
router.post("/:id/status-check", async (req, res) => {
  const offerId = req.params.id;
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const transaction_id = req.body.transaction_id || crypto.randomUUID();

  try {
    const offer = await loadOffer(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    // 🔹 Create transaction (FIRST TIME)
    await pool.query(
      `
      INSERT INTO offer_transactions
      (id, offer_id, transaction_id, msisdn, status, ip_address, user_agent)
      VALUES (gen_random_uuid(),$1,$2,$3,'started',$4,$5)
      ON CONFLICT (transaction_id) DO NOTHING
      `,
      [offerId, transaction_id, req.body.msisdn, ip, ua]
    );

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

    const success =
      response?.status === "OK" ||
      response?.status === "SUCCESS" ||
      response?.success === true;

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, transaction_id, step, status, request_payload, response_payload, ip_address, user_agent)
      VALUES ($1,$2,'status_check',$3,$4,$5,$6,$7)
      `,
      [offerId, transaction_id, success ? "success" : "failed", payload, response, ip, ua]
    );

    res.json({ transaction_id, response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Status check failed" });
  }
});

/* ================= STEP 2: PIN SEND ================= */
router.post("/:id/pin-send", async (req, res) => {
  const offerId = req.params.id;
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const transaction_id = req.body.transaction_id;

  try {
    const offer = await loadOffer(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const params = Array.isArray(offer.pin_send_params)
      ? offer.pin_send_params
      : JSON.parse(offer.pin_send_params || "[]");

    const payload = buildPayload(params, req.body, { ip, ua });

    const response = await executeApi({
      method: offer.api_mode,
      url: offer.pin_send_url,
      payload,
    });

    const success =
      response?.status === "OK" ||
      response?.success === true;

    await pool.query(
      `
      UPDATE offer_transactions
      SET status = 'otp_sent'
      WHERE transaction_id = $1
      `,
      [transaction_id]
    );

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, transaction_id, step, status, request_payload, response_payload, ip_address, user_agent)
      VALUES ($1,$2,'pin_send',$3,$4,$5,$6,$7)
      `,
      [offerId, transaction_id, success ? "success" : "failed", payload, response, ip, ua]
    );

    res.json({ transaction_id, response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "PIN send failed" });
  }
});

/* ================= STEP 3: PIN VERIFY ================= */
router.post("/:id/pin-verify", async (req, res) => {
  const offerId = req.params.id;
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const transaction_id = req.body.transaction_id;

  try {
    const offer = await loadOffer(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const params = Array.isArray(offer.pin_verify_params)
      ? offer.pin_verify_params
      : JSON.parse(offer.pin_verify_params || "[]");

    const payload = buildPayload(params, req.body, { ip, ua });

    const response = await executeApi({
      method: offer.api_mode,
      url: offer.pin_verify_url,
      payload,
    });

    const success =
      response?.status === "OK" ||
      response?.success === true;

    await pool.query(
      `
      UPDATE offer_transactions
      SET status = $1
      WHERE transaction_id = $2
      `,
      [success ? "completed" : "failed", transaction_id]
    );

    await pool.query(
      `
      INSERT INTO offer_executions
      (offer_id, transaction_id, step, status, request_payload, response_payload, ip_address, user_agent)
      VALUES ($1,$2,'pin_verify',$3,$4,$5,$6,$7)
      `,
      [offerId, transaction_id, success ? "success" : "failed", payload, response, ip, ua]
    );

    res.json({ transaction_id, response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "PIN verify failed" });
  }
});

export default router;
