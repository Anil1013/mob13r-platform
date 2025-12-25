import { Router } from "express";
import crypto from "crypto";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

/* ================= HELPERS ================= */
const buildPayload = (allowed = [], source = {}, extra = {}) => {
  const payload = {};
  allowed.forEach((k) => {
    if (source[k] !== undefined) payload[k] = source[k];
  });
  return { ...payload, ...extra };
};

const executeApi = async ({ method, url, payload }) => {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (method === "POST") options.body = JSON.stringify(payload);
  const res = await fetch(url, options);
  return res.json();
};

const loadOffer = async (id) => {
  const { rows } = await pool.query("SELECT * FROM offers WHERE id = $1", [id]);
  return rows[0];
};

/* ================= STATUS CHECK ================= */
router.post("/:id/status-check", async (req, res) => {
  const offer = await loadOffer(req.params.id);
  if (!offer) return res.status(404).json({ message: "Offer not found" });
  if (offer.steps?.status_check === false)
    return res.status(400).json({ message: "Status check disabled" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const user_ip = req.body.user_ip || req.body.ip || ip;
  const transaction_id = req.body.transaction_id || crypto.randomUUID();

  const params = Array.isArray(offer.status_check_params)
    ? offer.status_check_params
    : JSON.parse(offer.status_check_params || "[]");

  const payload = buildPayload(
    params,
    { ...req.body, transaction_id },
    { user_ip, ip, ua }
  );

  const response = await executeApi({
    method: offer.api_mode,
    url: offer.status_check_url,
    payload,
  });

  res.json({ transaction_id, response });
});

/* ================= PIN SEND ================= */
router.post("/:id/pin-send", async (req, res) => {
  const offer = await loadOffer(req.params.id);
  if (!offer) return res.status(404).json({ message: "Offer not found" });
  if (offer.steps?.pin_send === false)
    return res.status(400).json({ message: "PIN send disabled" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const user_ip = req.body.user_ip || req.body.ip || ip;

  const params = Array.isArray(offer.pin_send_params)
    ? offer.pin_send_params
    : JSON.parse(offer.pin_send_params || "[]");

  const payload = buildPayload(params, req.body, { user_ip, ip, ua });

  const response = await executeApi({
    method: offer.api_mode,
    url: offer.pin_send_url,
    payload,
  });

  res.json({ transaction_id: req.body.transaction_id, response });
});

/* ================= PIN VERIFY ================= */
router.post("/:id/pin-verify", async (req, res) => {
  const offer = await loadOffer(req.params.id);
  if (!offer) return res.status(404).json({ message: "Offer not found" });
  if (offer.steps?.pin_verify === false)
    return res.status(400).json({ message: "PIN verify disabled" });

  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
  const ua = req.headers["user-agent"];
  const user_ip = req.body.user_ip || req.body.ip || ip;

  const params = Array.isArray(offer.pin_verify_params)
    ? offer.pin_verify_params
    : JSON.parse(offer.pin_verify_params || "[]");

  const payload = buildPayload(params, req.body, { user_ip, ip, ua });

  const response = await executeApi({
    method: offer.api_mode,
    url: offer.pin_verify_url,
    payload,
  });

  const success =
    response?.status === "OK" ||
    response?.status === "SUCCESS" ||
    response?.success === true;

  res.json({
    transaction_id: req.body.transaction_id,
    response,
    redirect_url: success ? offer.redirect_url : null,
  });
});

export default router;
