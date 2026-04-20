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
 * --- 1. THE MASTER SCANNER (V14 - Full Logic Merge & Placeholder Fix) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Mob13r-Robo V14: Master Logic Merge for ID: ${offerId}`);

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Model Selection (Using stable string format)
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    
    // Universal Parsing
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
      SYNC RULES:
      - Clean all URLs: Convert #MSISDN# to {msisdn}, #ANDROIDID# to {transaction_id}, #OTP# to {otp}.
      - Extract FULL URLs (not just filenames like pingen.php).
      - Identify Anti-Fraud logic (Evina, Alacrity script URIs, Partner/Campaign IDs).
      - Map exactly to: "pin_send_url", "verify_pin_url", "check_status_url", "portal_url".

      Return ONLY JSON:
      {
        "has_fraud": boolean,
        "fraud": { "af_provider": "string", "af_url": "string", "partner_uri": "string", "campaign_uri": "string" },
        "core_urls": { "pin_send_url": "string", "verify_pin_url": "string", "check_status_url": "string", "portal_url": "string" },
        "all_params": { "method_send": "GET|POST", "cmpid": "string", "service_id": "string", "confirm_button_id": "string" }
      }
      CONTENT: ${docText.slice(0, 19000)}`;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (err) {
      const fallback = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      result = await fallback.generateContent(prompt);
    }

    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    // 🛠️ 1. FORCE UPDATE Core Offer Table
    const urls = aiConfig.core_urls || {};
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, updated_at = NOW() WHERE id = $6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    // 🛠️ 2. MIRROR SYNC for Dashboard UI
    const paramsMap = new Map();
    const uiCoreKeys = ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'];
    uiCoreKeys.forEach(k => { if(urls[k]) paramsMap.set(k, urls[k]); });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => paramsMap.set(k.toLowerCase(), v));
    }
    if (aiConfig.fraud) {
      Object.entries(aiConfig.fraud).forEach(([k, v]) => paramsMap.set(k.toLowerCase(), v));
    }

    // Final Batch Sync for UI
    for (const [key, val] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({ success: true, message: "Mob13r-Robo V14: Master Logic Synced!", data: aiConfig });
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
    res.json({ success: true, offer: offerRes.rows[0], params: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
