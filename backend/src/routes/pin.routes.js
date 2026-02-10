import express from "express";
import { handlePinSend, handlePinVerify } from "../services/routerEngine.js";

const router = express.Router();

/* ================= PIN SEND ================= */

router.all("/pin/send/:offer_id", async (req, res) => {
  try {
    const result = await handlePinSend(req);
    return res.status(result.httpCode).json(result.body);
  } catch (err) {
    return res.status(500).json({
      status: "FAILED",
      message: "Router error"
    });
  }
});

/* ================= PIN VERIFY ================= */

router.all("/pin/verify", async (req, res) => {
  try {
    const result = await handlePinVerify(req);
    return res.status(result.httpCode).json(result.body);
  } catch {
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
