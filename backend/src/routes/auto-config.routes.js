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
 * --- 1. THE UNIVERSAL SCANNER (V16 - Timeout & Performance Fix) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Mob13r-Robo V16: Performance Sync for ID: ${offerId}`);

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Model selection with low temperature for faster results
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0.1, topP: 0.8 } 
    });

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    
    // 🛠️ Optimization: Parsing only necessary chunk to avoid 504
    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        const data = await pdfParse(fileBuffer);
        docText = data.text;
      } else {
        docText = fileBuffer.toString('utf-8', 0, 10000); // Smaller chunk for speed
      }
    } catch (parseErr) {
      docText = fileBuffer.toString('utf-8', 0, 10000);
    }

    const prompt = `
      Expert AdTech Parser: Extract technical details ONLY from the provided CONTENT.
      
      MAPPING RULES:
      1. Clean Placeholders: Convert #MSISDN#, {msisdn}, [msisdn] to {msisdn}. [cite: 15, 33]
      2. Clean Tracking: Convert #ANDROIDID#, #TXID#, {click_id} to {transaction_id}. [cite: 23, 24]
      3. CORE URLs: pin_send_url, verify_pin_url, check_status_url, portal_url. [cite: 15, 33, 49, 61]
      4. Extra: Extract sessionKey, cid, pub_id if present. [cite: 15, 25, 41]

      Return ONLY JSON:
      {
        "has_fraud": boolean,
        "fraud": { "af_provider": "string", "af_url": "string" },
        "core_urls": { "pin_send_url": "string", "verify_pin_url": "string", "check_status_url": "string", "portal_url": "string" },
        "all_params": { "method_send": "GET|POST", "service_id": "string", "cmpid": "string", "sessionKey": "string" }
      }
      CONTENT: ${docText.slice(0, 12000)}`; // Optimized text length

    // AI Call
    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();
    const aiConfig = JSON.parse(responseText.replace(/```json|```/g, "").trim());

    const urls = aiConfig.core_urls || {};
    
    // --- 🛠️ Database Updates (Logic Restored) ---
    await pool.query(
      `UPDATE offers SET pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4, has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    const paramsMap = new Map();
    // Mirror Sync for UI
    ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'].forEach(k => {
        if(urls[k]) paramsMap.set(k, urls[k]);
    });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v !== null && v !== undefined) paramsMap.set(k.toLowerCase(), v);
      });
    }

    // Batch Sync with Safety Check
    for (const [key, val] of paramsMap.entries()) {
      if (val !== null && val !== undefined && val !== "") {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
           ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
          [offerId, key, val]
        );
      }
    }

    res.json({ success: true, message: "Mob13r-Robo: Synced via V16!", data: aiConfig });
  } catch (err) {
    console.error("Timeout/Error:", err.message);
    res.status(500).json({ error: "Request took too long or failed", details: err.message });
  }
});

export default router;
