import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import axios from "axios";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();

/**
 * --- 1. THE MASTER SCANNER (V17 - Gemini 3 Primary - No Logic Broken) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Mob13r-Robo V17: Gemini 3 Master Sync for ID: ${offerId}`);

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ Gemini 3 Flash Preview as Primary (as requested)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0.1 } 
    });

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    
    // Universal Parsing Logic (Safe & Fixed)
    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        const data = await pdfParse(fileBuffer);
        docText = data.text;
      } else {
        docText = fileBuffer.toString('utf-8', 0, 15000);
      }
    } catch (parseErr) {
      docText = fileBuffer.toString('utf-8', 0, 15000);
    }

    const prompt = `
      Expert AdTech Parser: Extract technical details.
      RULES:
      - Use exact keys: "pin_send_url", "verify_pin_url", "check_status_url", "portal_url".
      - Extract FULL URLs with parameters.
      - Convert #MSISDN#, {msisdn}, [msisdn] to {msisdn}.
      - Convert #ANDROIDID#, #TXID#, {click_id} to {transaction_id}.
      - Identify Anti-Fraud: Evina script source, Alacrity URI, or MCP details.
      - Capture: cmpid, sessionKey, pubId, confirm_button_id.

      Return ONLY JSON:
      {
        "has_fraud": boolean,
        "fraud": { "af_provider": "string", "af_url": "string", "partner_uri": "string" },
        "core_urls": { "pin_send_url": "string", "verify_pin_url": "string", "check_status_url": "string", "portal_url": "string" },
        "all_params": { "method_send": "GET|POST", "cmpid": "string", "sessionKey": "string" }
      }
      CONTENT: ${docText.slice(0, 15000)}`;

    // Gemini 3 Call with Emergency Fallback Only (to prevent 503 crash)
    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (err) {
       console.log("Gemini 3 Busy, using high-tier Pro model as safety...");
       const safetyModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
       result = await safetyModel.generateContent(prompt);
    }

    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    // --- 🛠️ 1. Database Offers Update ---
    const urls = aiConfig.core_urls || {};
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, updated_at = NOW() WHERE id = $6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    // --- 🛠️ 2. Dashboard Display Sync (Null-Safe) ---
    const paramsMap = new Map();
    const coreKeys = ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'];
    coreKeys.forEach(k => { if(urls[k]) paramsMap.set(k, urls[k]); });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v !== null && v !== undefined) paramsMap.set(k.toLowerCase(), v);
      });
    }
    if (aiConfig.fraud) {
      Object.entries(aiConfig.fraud).forEach(([k, v]) => {
        if (v !== null && v !== undefined) paramsMap.set(k.toLowerCase(), v);
      });
    }

    for (const [key, val] of paramsMap.entries()) {
      if (val !== null && val !== undefined && val !== "") {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
           ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
          [offerId, key, val]
        );
      }
    }

    res.json({ success: true, message: "Master Robo V17: Gemini 3 Sync Complete!", data: aiConfig });
  } catch (err) {
    res.status(500).json({ error: "Integration Failed", details: err.message });
  }
});

/**
 * --- 2. RUNTIME ENGINE ---
 */
router.get("/get-runtime-config/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
    const paramsRes = await pool.query("SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1", [offerId]);
    const config = {};
    paramsRes.rows.forEach(p => config[p.param_key] = p.param_value);
    res.json({ success: true, offer: offerRes.rows[0], params: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
