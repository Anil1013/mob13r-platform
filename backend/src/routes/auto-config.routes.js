import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();

/**
 * --- 1. THE UNIVERSAL SCANNER (V19 - Final Stable & Optimized) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  // 🛠️ Manually handling CORS to stop browser blocks
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  try {
    const { offerId } = req.params;
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 🛠️ Precision Mode: Temperature 0.0 for zero hallucination
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0.0, maxOutputTokens: 800 } 
    });

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    
    // Parsing with error handling
    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        const data = await pdfParse(fileBuffer);
        docText = data.text;
      } else {
        docText = fileBuffer.toString('utf-8', 0, 10000);
      }
    } catch (parseErr) {
      docText = fileBuffer.toString('utf-8', 0, 10000);
    }

    const prompt = `
      Extract technical details ONLY from the provided text.
      Strict Rule: Convert #MSISDN# or {msisdn} to {msisdn}. Convert #ANDROIDID# to {transaction_id}.
      
      URLs Required: "pin_send_url", "verify_pin_url", "check_status_url", "portal_url".
      Params Required: cid, sessionKey, pub_id, cmpid.

      Return JSON ONLY:
      {
        "has_fraud": boolean,
        "core_urls": { "pin_send_url": "string", "verify_pin_url": "string", "check_status_url": "string", "portal_url": "string" },
        "all_params": { "cid": "string", "sessionKey": "string", "method": "string" }
      }
      CONTENT: ${docText.slice(0, 10000)}`;

    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    const urls = aiConfig.core_urls || {};
    
    // 🛠️ Step 1: Update Core Offer
    await pool.query(
      `UPDATE offers SET pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4, has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    // 🛠️ Step 2: Dashboard Parameter Sync (Safe from Nulls)
    const paramsMap = new Map();
    ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'].forEach(k => {
        if(urls[k]) paramsMap.set(k, urls[k]);
    });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v && v !== "N/A" && v !== null) paramsMap.set(k.toLowerCase(), v);
      });
    }

    for (const [key, val] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({ success: true, message: "Mob13r-Robo V19 Optimized!", data: aiConfig });
  } catch (err) {
    res.status(500).json({ error: "Sync Failed", details: err.message });
  }
});

export default router;
