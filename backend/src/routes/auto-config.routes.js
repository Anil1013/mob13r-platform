import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import axios from "axios";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const router = express.Router();

// --- 1. THE UNIVERSAL SCANNER (Har Advertiser ke liye) ---
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Mob13r-Robo V5: Master Integration Scan for ID: ${offerId}`);

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    if (ext.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      docText = result.value;
    } else if (ext.endsWith(".pdf")) {
      const data = await pdf(fileBuffer);
      docText = data.text;
    }

    const prompt = `
      Analyze this Advertiser API document. You must extract EVERY technical detail.
      
      RULES:
      1. Detect HTTP Methods: GET (Omantel style ) vs POST (Collectcent style [cite: 339, 377]).
      2. Handle Anti-Fraud: Evina [cite: 835], MCP/One97 [cite: 231, 464], Opticks [cite: 111], or Alacrity[cite: 574].
      3. Map all params: service_id [cite: 344, 382, 588, 611, 627, 653, 694, 728], partner_id [cite: 3, 25, 40, 53, 65, 78, 89, 98, 115, 117, 127, 147, 167, 183, 201, 212, 220, 587, 611, 627, 653, 694, 728, 731], operator_id [cite: 3, 27, 42, 118, 129, 149], token [cite: 499, 590, 617, 618, 653, 694, 698, 900, 922], bfId[cite: 113, 116, 133, 153].
      4. Placeholders: {msisdn}, {otp}, {transaction_id}, {click_id}, {session_id}.

      Return ONLY JSON:
      {
        "flow": "pin | otp | direct",
        "has_fraud": boolean,
        "fraud_details": { "provider": "mcp|evina|opticks|alacrity", "url": "string", "method": "string" },
        "steps": [
          {
            "type": "send | verify | check | redirect",
            "url": "string",
            "method": "GET | POST",
            "data_type": "query | body",
            "headers": { "Authorization": "string", "Content-Type": "string" },
            "params": [{ "key": "string", "value": "string" }]
          }
        ]
      }
      CONTENT: ${docText.slice(0, 18000)}`;

    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    // Update main URLs in Offers Table
    const findStep = (t) => aiConfig.steps.find(s => s.type === t);
    await pool.query(
      `UPDATE offers SET 
        pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4,
        has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
      [findStep("send")?.url, findStep("verify")?.url, findStep("check")?.url, findStep("redirect")?.url, !!aiConfig.has_fraud, offerId]
    );

    // Sync ALL parameters and metadata
    const paramsMap = new Map();
    if (aiConfig.fraud_details) {
      Object.entries(aiConfig.fraud_details).forEach(([k, v]) => paramsMap.set(`af_${k}`, v));
    }

    aiConfig.steps.forEach(step => {
      paramsMap.set(`method_${step.type}`, step.method);
      paramsMap.set(`dtype_${step.type}`, step.data_type);
      if (step.headers) Object.entries(step.headers).forEach(([k, v]) => paramsMap.set(k.toLowerCase(), v));
      if (step.params) step.params.forEach(p => paramsMap.set(p.key.toLowerCase(), p.value || `{${p.key}}`));
    });

    for (const [key, val] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({ success: true, message: "Universal V5 Scan Complete", data: aiConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. THE UNIVERSAL RUNTIME ENGINE (For Landing Pages) ---
router.get("/get-runtime-config/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
    const paramsRes = await pool.query("SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1", [offerId]);
    
    const config = {};
    paramsRes.rows.forEach(p => config[p.param_key] = p.param_value);

    const transactionId = `m13r_${Date.now()}`;
    let fraudSnippet = null;

    // 🛡️ MULTI-PROVIDER FRAUD HANDLER
    if (offerRes.rows[0].has_antifraud) {
       const provider = config['af_provider'];
       const afUrl = config['af_url'] || config['af_prepare_url'];

       if (provider === 'mcp' && afUrl) {
          const mcpRes = await axios.get(afUrl.replace(/{click_id}/gi, transactionId), { headers: { 'user-agent': req.headers['user-agent'] } });
          fraudSnippet = mcpRes.data.source || mcpRes.data; [cite: 276, 280, 291, 297]
       } else if (provider === 'evina' || provider === 'opticks' || afUrl) {
          fraudSnippet = `(function(){ var s=document.createElement('script'); s.src='${afUrl}'; document.head.appendChild(s); })();`; [cite: 110, 577, 855, 857]
       }
    }

    res.json({
      success: true,
      offer: offerRes.rows[0],
      params: config,
      runtime: {
        transaction_id: transactionId,
        fraud_snippet: fraudSnippet,
        methods: { send: config['method_send'], verify: config['method_verify'] }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
