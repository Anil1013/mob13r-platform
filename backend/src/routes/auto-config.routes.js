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

/**
 * --- 1. THE UNIVERSAL SCANNER (V7 - Semantic & Fuzzy Mapping) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Mob13r-Robo V7: Deep Semantic Scan for ID: ${offerId}`);

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
      Expert AdTech Parser: Extract EVERY technical detail.
      
      MAPPING LOGIC:
      - Recognize ANY term for Sending OTP: (pin_request, otp_send, pingen, init_sms, requestPinInApp).
      - Recognize ANY term for Verification: (pin_verify, otp_validate, pinval, confirm_otp, verifyPinInApp).
      - Recognize ANY term for Status: (check_status, action_check, subscription_status).
      - Recognize ANY term for Redirection: (portal_url, success_redirect, access_url, product_url).

      PARAMETER LOGIC:
      - Scan for: msisdn, ip, user_agent, pin/otp, click_id/pixel, transaction_id, partner_id, service_id, promoId, pubId, sessionKey/token.
      - Extract Auth headers (Bearer, Basic).
      - Capture Sub-parameters (sub1 to sub5).

      Return ONLY JSON:
      {
        "has_fraud": boolean,
        "fraud": { "provider": "string", "url": "string", "prepare_url": "string" },
        "steps": [
          {
            "target_column": "send | verify | check | redirect",
            "url": "string",
            "method": "GET | POST",
            "data_type": "query | body",
            "headers": { "Key": "Value" },
            "params": [{ "key": "string", "value": "string" }]
          }
        ]
      }
      CONTENT: ${docText.slice(0, 19000)}`;

    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    // --- Strict DB Update Logic ---
    const findStep = (col) => aiConfig.steps.find(s => s.target_column === col);

    await pool.query(
      `UPDATE offers SET 
        pin_send_url = COALESCE($1, pin_send_url), 
        pin_verify_url = COALESCE($2, pin_verify_url), 
        check_status_url = COALESCE($3, check_status_url), 
        portal_url = COALESCE($4, portal_url),
        has_antifraud = $5, 
        updated_at = NOW() 
       WHERE id = $6`,
      [findStep("send")?.url, findStep("verify")?.url, findStep("check")?.url, findStep("redirect")?.url, !!aiConfig.has_fraud, offerId]
    );

    const paramsMap = new Map();
    
    // Save Fraud Config
    if (aiConfig.fraud) {
      Object.entries(aiConfig.fraud).forEach(([k, v]) => paramsMap.set(`af_${k}`, v));
    }

    // Save All Meta & Params
    aiConfig.steps.forEach(step => {
      paramsMap.set(`method_${step.target_column}`, step.method);
      paramsMap.set(`dtype_${step.target_column}`, step.data_type);
      
      if (step.headers) {
        Object.entries(step.headers).forEach(([k, v]) => paramsMap.set(k.toLowerCase(), v));
      }
      if (step.params) {
        step.params.forEach(p => paramsMap.set(p.key.toLowerCase(), p.value || `{${p.key}}`));
      }
    });

    // Multi-Insert Batch
    for (const [key, val] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({ success: true, message: "Mob13r-Robo: Semantic extraction success!", data: aiConfig });
  } catch (err) {
    console.error("Scanner Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * --- 2. THE UNIVERSAL RUNTIME ENGINE ---
 */
router.get("/get-runtime-config/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
    const paramsRes = await pool.query("SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1", [offerId]);
    
    const config = {};
    paramsRes.rows.forEach(p => config[p.param_key] = p.param_value);

    let fraudSnippet = null;
    const transactionId = `m13r_${Date.now()}`;

    if (offerRes.rows[0]?.has_antifraud) {
       const provider = config['af_provider'];
       const afUrl = config['af_url'] || config['af_prepare_url'] || config['antifraud_url'];

       if (provider === 'mcp' && afUrl) {
          try {
            const mcpRes = await axios.get(afUrl.replace(/{click_id}|{transaction_id}/gi, transactionId), { 
              headers: { 'user-agent': req.headers['user-agent'] } 
            });
            fraudSnippet = mcpRes.data.source || mcpRes.data;
          } catch (e) { console.error("MCP Script Fetch Failed"); }
       } else if (afUrl) {
          fraudSnippet = `(function(){ var s=document.createElement('script'); s.src='${afUrl}'; document.head.appendChild(s); })();`;
       }
    }

    res.json({
      success: true,
      offer: offerRes.rows[0],
      params: config,
      runtime: {
        transaction_id: transactionId,
        fraud_snippet: fraudSnippet,
        methods: { 
          send: config['method_send'] || 'POST', 
          verify: config['method_verify'] || 'POST',
          check: config['method_check'] || 'POST'
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
