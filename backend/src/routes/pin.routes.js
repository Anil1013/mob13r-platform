import express from "express";
import { handlePinSend, handlePinVerify } from "../services/routerEngine.js";

const router = express.Router();

/* PIN SEND */
router.all("/pin/send/:offer_id", async (req,res)=>{

  const result = await handlePinSend(req);
  res.status(result.httpCode).json(result.body);

});

/* PIN VERIFY */
router.all("/pin/verify", async (req,res)=>{

  const result = await handlePinVerify(req);
  res.status(result.httpCode).json(result.body);

});

export default router;
