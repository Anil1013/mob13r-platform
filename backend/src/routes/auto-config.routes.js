import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

let pdfParse;
try {
  const rawPdf = require("pdf-parse");
  pdfParse = typeof rawPdf === 'function' ? rawPdf : rawPdf.default;
} catch (e) {
  console.warn("PDF library fallback enabled.");
}

const router = express.Router();

router.post("/auto-integrate/:offerId", async (req, res) => {
  // ✅ 1. CORS Headers (Strictly needed for dashboard communication)
  res.header("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.sendStatus(200);

  try {
    const { offerId } = req.params;
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ 2. Gemini 3 Strict JSON Mode (Sabse Fast Response ke liye)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { 
            temperature: 0.0, 
            responseMimeType: "application/json" 
        } 
    });

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    
    // ✅ 3. Ultra-Fast Parsing (Only first 7000 chars for core details)
    if (ext.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      docText = result.value;
    } else if (ext.endsWith(".pdf") && typeof pdfParse === 'function') {
      const data = await pdfParse(fileBuffer);
      docText = data.text;
    } else {
      docText = fileBuffer.toString('utf-8', 0, 7000);
    }

    const prompt = `Extract AdTech integration details ONLY from this text: ${docText.slice(0, 7000)}.
    Required Keys: pin_send_url, verify_pin_url, check_status_url, portal_url, cid, sessionKey, pub_id.
    Convert all placeholders to {msisdn} and {transaction_id}.
    Return JSON only.`;

    // AI Call
    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse((await result.response).text());

    const urls = aiConfig.core_urls || {};
    
    // ✅ 4. Atomic Database Update (Offers Table)
    await pool.query(
      `UPDATE offers SET pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4, has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    // ✅ 5. Mirror Sync for Parameters (Safe from Nulls)
    const paramsMap = new Map();
    // Core URL keys required by UI
    ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'].forEach(k => {
        if(urls[k]) paramsMap.set(k, urls[k]);
    });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v && v !== "N/A" && v !== null) paramsMap.set(k.toLowerCase(), v);
      });
    }

    // Single Batch Query for Params
    for (const [key, val] of paramsMap.entries()) {
      if (val && val !== "") {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
           ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
          [offerId, key, val]
        );
      }
    }

    res.json({ success: true, message: "Mob13r-Robo V24: High-Speed Sync Complete!", data: aiConfig });
  } catch (err) {
    console.error("Critical Sync Failure:", err.message);
    res.status(500).json({ error: "Operation Timeout", details: err.message });
  }
});

export default router;
