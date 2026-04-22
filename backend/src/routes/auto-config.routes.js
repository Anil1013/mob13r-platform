import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import axios from "axios";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
// ✅ Fix: ESM compatible pdf-parse loading
const pdfParse = require("pdf-parse");

const router = express.Router();

/**
 * --- 1. THE UNIVERSAL SCANNER (V15 - All-Logic Master Integration) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Mob13r-Robo V15: Master Dashboard Sync for ID: ${offerId}`);

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Model selection with direct fallback to ensure no 404/503 errors
    let model;
    try {
      model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0.0 } 
      });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    
    // 🛠️ UNIVERSAL PARSING LOGIC (Handles All Formats)
    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        const data = await pdfParse(fileBuffer);
        docText = data.text;
      } else if (ext.endsWith(".txt") || ext.endsWith(".csv") || ext.endsWith(".json")) {
        docText = fileBuffer.toString('utf-8');
      } else {
        docText = fileBuffer.toString('utf-8', 0, 18000);
      }
    } catch (parseErr) {
      console.warn("Parsing Warning: Falling back to raw buffer.");
      docText = fileBuffer.toString('utf-8', 0, 18000);
    }

    // 🚀 MASTER PROMPT: Includes SAV, Gameo, Absolutely, Korek & placeholder logic
    const prompt = `
      STRICT INSTRUCTION: Extract technical details ONLY from the provided CONTENT.
      
      MAPPING RULES (Universal Support):
      1. Clean Placeholders: Convert #MSISDN#, {msisdn}, [msisdn] to {msisdn}.
      2. Clean Tracking: Convert #ANDROIDID#, #TXID#, {click_id} to {transaction_id}.
      3. Clean OTP: Convert #OTP#, #PIN# to {otp}.
      4. CORE URLs: Extract FULL links for pin_send_url, verify_pin_url, check_status_url, portal_url.
      5. Anti-Fraud: Identify Evina scripts, Alacrity IDs (Partner/Campaign), and Korek's confirm_button_id.

      Return ONLY valid JSON:
      {
        "has_fraud": boolean,
        "fraud": { "af_provider": "string", "af_url": "string", "partner_uri": "string", "campaign_uri": "string" },
        "core_urls": {
          "pin_send_url": "string",
          "verify_pin_url": "string",
          "check_status_url": "string",
          "portal_url": "string"
        },
        "all_params": {
           "method_send": "GET|POST",
           "service_id": "string",
           "cmpid": "string",
           "sessionKey": "string",
           "confirm_button_id": "string"
        }
      }
      CONTENT: ${docText.slice(0, 19000)}`;

    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    // --- 🛠️ 1. FORCE UPDATE Core Offer Table ---
    const urls = aiConfig.core_urls || {};
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, 
        pin_verify_url = $2, 
        check_status_url = $3, 
        portal_url = $4,
        has_antifraud = $5, 
        updated_at = NOW() 
       WHERE id = $6`,
      [
        urls.pin_send_url || null, 
        urls.verify_pin_url || null, 
        urls.check_status_url || null, 
        urls.portal_url || null, 
        !!aiConfig.has_fraud, 
        offerId
      ]
    );

    // --- 🛠️ 2. MIRROR SYNC for Dashboard Display (Null Safe) ---
    const paramsMap = new Map();
    
    // Core URL Mapping
    if (urls.pin_send_url) paramsMap.set("pin_send_url", urls.pin_send_url);
    if (urls.verify_pin_url) paramsMap.set("verify_pin_url", urls.verify_pin_url);
    if (urls.check_status_url) paramsMap.set("check_status_url", urls.check_status_url);
    if (urls.portal_url) paramsMap.set("portal_url", urls.portal_url);

    // Dynamic Parameter Mapping
    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v !== null && v !== undefined) paramsMap.set(k.toLowerCase(), v);
      });
    }

    // Fraud Details Mapping
    if (aiConfig.fraud) {
      Object.entries(aiConfig.fraud).forEach(([k, v]) => {
        if (v !== null && v !== undefined) paramsMap.set(k.toLowerCase(), v);
      });
    }

    // Batch Database Insert with NOT NULL safety
    for (const [key, val] of paramsMap.entries()) {
      if (val !== null && val !== undefined && val !== "") {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
           ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
          [offerId, key, val]
        );
      }
    }

    res.json({ success: true, message: "Mob13r-Robo: Universal Sync Complete!", data: aiConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    res.json({
      success: true,
      offer: offerRes.rows[0],
      params: config,
      runtime: { transaction_id: `m13r_${Date.now()}` }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
