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
 * --- 1. THE UNIVERSAL SCANNER (V6 - Smart Fuzzy Matching) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Mob13r-Robo V6: Universal Smart Scan for ID: ${offerId}`);

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
      Analyze this Advertiser API document. Extract EVERY technical detail.
      
      SMART MAPPING RULES:
      1. Map similar terms to these standard keys:
         - "PIN Request", "Send OTP", "Init" -> "send"
         - "Verify PIN", "Validation", "Confirm" -> "verify"
         - "Status", "Action Check", "Check API" -> "check"
         - "Success URL", "Product Link", "Access" -> "redirect"
      
      2. Extract all parameters and map them even if names vary:
         - (msisdn, mobile), (otp, pin, pincode), (transaction_id, trans_id, session_id), (click_id, pixel, cid).
      
      3. Capture Anti-Fraud info: Provider (MCP/Evina/Opticks), Script URLs, and any unique tokens like bfId.

      Return ONLY JSON:
      {
        "flow": "pin | otp | direct",
        "has_fraud": boolean,
        "fraud": { "provider": "string", "url": "string", "method": "GET|POST" },
        "steps": [
          {
            "standard_type": "send | verify | check | redirect",
            "original_name": "string",
            "url": "string",
            "method": "GET | POST",
            "data_type": "query | body",
            "headers": { "Key": "Value" },
            "params": [{ "key": "string", "value": "string" }]
          }
        ]
      }
      CONTENT: ${docText.slice(0, 18500)}`;

    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    // --- Database Mapping Logic ---
    const getS = (type) => aiConfig.steps.find(s => s.standard_type === type);

    await pool.query(
      `UPDATE offers SET 
        pin_send_url = COALESCE($1, pin_send_url), 
        pin_verify_url = COALESCE($2, pin_verify_url), 
        check_status_url = COALESCE($3, check_status_url), 
        portal_url = COALESCE($4, portal_url),
        has_antifraud = $5, 
        updated_at = NOW() 
       WHERE id = $6`,
      [getS("send")?.url, getS("verify")?.url, getS("check")?.url, getS("redirect")?.url, !!aiConfig.has_fraud, offerId]
    );

    const paramsMap = new Map();
    
    // Auto-fetch and Save all Fraud details
    if (aiConfig.fraud) {
      Object.entries(aiConfig.fraud).forEach(([k, v]) => paramsMap.set(`af_${k}`, v));
    }

    // Auto-fetch all parameters from all steps (Fuzzy matched keys)
    aiConfig.steps.forEach(step => {
      paramsMap.set(`method_${step.standard_type}`, step.method);
      paramsMap.set(`dtype_${step.standard_type}`, step.data_type);
      
      if (step.headers) {
        Object.entries(step.headers).forEach(([k, v]) => paramsMap.set(k.toLowerCase(), v));
      }
      if (step.params) {
        step.params.forEach(p => paramsMap.set(p.key.toLowerCase(), p.value || `{${p.key}}`));
      }
    });

    // Final Multi-Insert to DB
    for (const [key, val] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({ success: true, message: "Mob13r-Robo: Auto-fetch complete!", data: aiConfig });
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
       const afUrl = config['af_url'] || config['antifraud_url'];

       if (provider === 'mcp' && afUrl) {
          try {
            const mcpRes = await axios.get(afUrl.replace(/{click_id}|{transaction_id}/gi, transactionId), { 
              headers: { 'user-agent': req.headers['user-agent'] } 
            });
            fraudSnippet = mcpRes.data.source || mcpRes.data;
          } catch (e) { console.error("MCP Fetch Failed"); }
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
          verify: config['method_verify'] || 'POST' 
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
