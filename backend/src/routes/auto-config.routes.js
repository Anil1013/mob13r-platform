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
 * --- 1. THE UNIVERSAL SCANNER (V18 - Strict Anchoring & Gemini 3 Only) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ Temperature 0.0 set kiya hai taaki AI sirf document ka text hi padhe
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0.0 } 
    });

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    
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

    // ✅ Strict Prompt: Force AI to extract ONLY from provided text
    const prompt = `
      STRICT INSTRUCTION: Extract technical details ONLY from the provided CONTENT below.
      DO NOT USE EXTERNAL KNOWLEDGE. DO NOT USE PREVIOUS EXAMPLES.
      
      CORE URL MAPPING (Extract exact URLs from text):
      - "pin_send_url": Extract Send Pin API.
      - "verify_pin_url": Extract Verify Pin API.
      - "check_status_url": Extract Check Status API.
      - "portal_url": Extract Portal URL.

      CLEANING RULES:
      - Clean placeholders: Convert #MSISDN#, {msisdn}, [msisdn] to {msisdn}.
      - Identify Anti-Fraud only if explicitly mentioned in the text.
      - Capture all parameters found in the URLs (e.g., cid, pub_id, sessionKey).

      Return ONLY JSON:
      {
        "has_fraud": boolean,
        "fraud": { "af_provider": "string", "af_url": "string" },
        "core_urls": { "pin_send_url": "string", "verify_pin_url": "string", "check_status_url": "string", "portal_url": "string" },
        "all_params": { "method": "string", "cid": "string", "sessionKey": "string" }
      }
      CONTENT: ${docText.slice(0, 15000)}`;

    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    const urls = aiConfig.core_urls || {};
    
    // --- 🛠️ 1. Sync Offers Table ---
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, updated_at = NOW() WHERE id = $6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    // --- 🛠️ 2. Sync Parameters (Null-Safe Mirroring) ---
    const paramsMap = new Map();
    ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'].forEach(k => {
        if(urls[k]) paramsMap.set(k, urls[k]);
    });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
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

    res.json({ success: true, message: "Mob13r-Robo: SAV Strict Sync Complete!", data: aiConfig });
  } catch (err) {
    res.status(500).json({ error: "Integration Failed", details: err.message });
  }
});

// Runtime config logic remains same...
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
