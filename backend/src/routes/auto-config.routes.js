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

router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 🛠️ FIX 1: Temperature 0.0 set kiya hai taaki AI apni taraf se data na banaye
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

    // 🛠️ FIX 2: Strict Anchoring Prompt (Force AI to use ONLY the provided text)
    const prompt = `
      STRICT INSTRUCTION: Extract technical details ONLY from the provided CONTENT below. 
      DO NOT use any external knowledge or previous example data.
      
      TARGETS:
      - "pin_send_url": Extract URL for Send Pin / Request OTP.
      - "verify_pin_url": Extract URL for Verify Pin / Confirm.
      - "check_status_url": Extract Status Check API.
      - "portal_url": Extract Portal / Success Redirect link.
      
      MAPPING RULES:
      1. Use #MSISDN# or {msisdn} as {msisdn}.
      2. Extract cid, pub_id, sub_pub_id, sessionKey if present in URLs.
      3. If no Anti-Fraud is mentioned in the text, set has_fraud to false.

      Return ONLY JSON:
      {
        "has_fraud": boolean,
        "fraud": { "af_provider": "string", "af_url": "string" },
        "core_urls": { "pin_send_url": "string", "verify_pin_url": "string", "check_status_url": "string", "portal_url": "string" },
        "all_params": { "method_send": "string", "cmpid": "string", "cid": "string" }
      }
      CONTENT: ${docText.slice(0, 19000)}`;

    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    const urls = aiConfig.core_urls || {};
    
    // --- 🛠️ Database Updates (Same Logic, No changes) ---
    await pool.query(
      `UPDATE offers SET pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4, has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    const paramsMap = new Map();
    const uiKeys = ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'];
    uiKeys.forEach(k => { if(urls[k]) paramsMap.set(k, urls[k]); });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v !== null && v !== undefined) paramsMap.set(k.toLowerCase(), v);
      });
    }

    for (const [key, val] of paramsMap.entries()) {
      if (val !== null && val !== undefined) {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
           ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
          [offerId, key, val]
        );
      }
    }

    res.json({ success: true, message: "Mob13r-Robo: Synced with Strict Data!", data: aiConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
