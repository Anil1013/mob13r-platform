import { Router } from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";
import fetch from "node-fetch";

const router = Router();
router.use(auth);

/* =====================================================
   HELPER: EXECUTE API CALL
===================================================== */
async function executeApi({ method, url, payload }) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (method === "POST") {
    options.body = JSON.stringify(payload);
  }

  const res = await fetch(url, options);
  return res.json();
}

/* =====================================================
   STEP 1: STATUS CHECK
===================================================== */
router.post("/:id/status-check", async (req, res) => {
  const offerId = req.params.id;
  const payload = req.body;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM offers WHERE id = $1",
      [offerId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Offer not found" });

    const offer = rows[0];

    const response = await executeApi({
      method: offer.api_mode,
      url: offer.status_check_url,
      payload,
    });

    await pool.query(
      `
      INSERT INTO offer_execution_logs
      (offer_id, step, request_payload, response_payload, status)
      VALUES ($1,'status_check',$2,$3,'success')
      `,
      [offerId, payload, response]
    );

    res.json(response);
  } catch (err) {
    console.error(err);

    await pool.query(
      `
      INSERT INTO offer_execution_logs
      (offer_id, step, request_payload, status, error)
      VALUES ($1,'status_check',$2,'failed',$3)
      `,
      [offerId, payload, err.message]
    );

    res.status(500).json({ message: "Status check failed" });
  }
});

/* =====================================================
   STEP 2: PIN SEND
===================================================== */
router.post("/:id/pin-send", async (req, res) => {
  const offerId = req.params.id;
  const payload = req.body;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM offers WHERE id = $1",
      [offerId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Offer not found" });

    const offer = rows[0];

    const response = await executeApi({
      method: offer.api_mode,
      url: offer.pin_send_url,
      payload,
    });

    await pool.query(
      `
      INSERT INTO offer_execution_logs
      (offer_id, step, request_payload, response_payload, status)
      VALUES ($1,'pin_send',$2,$3,'success')
      `,
      [offerId, payload, response]
    );

    res.json(response);
  } catch (err) {
    console.error(err);

    await pool.query(
      `
      INSERT INTO offer_execution_logs
      (offer_id, step, request_payload, status, error)
      VALUES ($1,'pin_send',$2,'failed',$3)
      `,
      [offerId, payload, err.message]
    );

    res.status(500).json({ message: "PIN send failed" });
  }
});

/* =====================================================
   STEP 3: PIN VERIFY
===================================================== */
router.post("/:id/pin-verify", async (req, res) => {
  const offerId = req.params.id;
  const payload = req.body;

  try {
    const { rows } = await pool.query(
      "SELECT * FROM offers WHERE id = $1",
      [offerId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Offer not found" });

    const offer = rows[0];

    const response = await executeApi({
      method: offer.api_mode,
      url: offer.pin_verify_url,
      payload,
    });

    await pool.query(
      `
      INSERT INTO offer_execution_logs
      (offer_id, step, request_payload, response_payload, status)
      VALUES ($1,'pin_verify',$2,$3,'success')
      `,
      [offerId, payload, response]
    );

    res.json(response);
  } catch (err) {
    console.error(err);

    await pool.query(
      `
      INSERT INTO offer_execution_logs
      (offer_id, step, request_payload, status, error)
      VALUES ($1,'pin_verify',$2,'failed',$3)
      `,
      [offerId, payload, err.message]
    );

    res.status(500).json({ message: "PIN verify failed" });
  }
});

export default router;
