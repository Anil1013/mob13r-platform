import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();

router.post("/auto-integrate/:offerId", async (req, res) => {
  // ✅ CORS Fix
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  try {
    const { offerId } = req.params;
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ Gemini 3 Flash Preview with Strict Temperature
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0.0, maxOutputTokens: 1000 } 
    });

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
      const data = await pdfParse(fileBuffer);
      docText = data.text;
    } else {
      docText = fileBuffer.toString('utf-8', 0, 10000);
    }

    const prompt = `
      Extract technical details ONLY from the provided text. DO NOT use external knowledge.
      Convert #MSISDN# or {msisdn} to {msisdn}. Convert #ANDROIDID# to {transaction_id}.
      Required Fields: pin_send_url, verify_pin_url, check_status_url, portal_url, cid, sessionKey, pub_id.
      
      Return ONLY valid JSON.
      CONTENT: ${docText.slice(0, 10000)}`;

    const result = await model.generateContent(prompt);
    let responseText = (await result.response).text();
    
    // ✅ Fix: Safe JSON Extraction (Unexpected token solution)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return a valid JSON structure");
    const aiConfig = JSON.parse(jsonMatch[0]);

    const urls = aiConfig.core_urls || {};
    
    // ✅ Update main table
    await pool.query(
      `UPDATE offers SET pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4, has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    const paramsMap = new Map();
    // ✅ Mirror Sync for UI
    ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'].forEach(k => {
        if(urls[k]) paramsMap.set(k, urls[k]);
    });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v && v !== null) paramsMap.set(k.toLowerCase(), v);
      });
    }

    // ✅ Null safety loop for database parameters
    for (const [key, val] of paramsMap.entries()) {
      if (val && val !== null && val !== "") {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
           ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
          [offerId, key, val]
        );
      }
    }

    res.json({ success: true, message: "Mob13r-Robo V19 Fixed!", data: aiConfig });
  } catch (err) {
    res.status(500).json({ error: "Sync Failed", details: err.message });
  }
});

export default router;
