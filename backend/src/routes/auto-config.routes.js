import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// ✅ PDF Fix: Is tarah load karne se "is not a function" error nahi aayega
const pdfParse = require("pdf-parse");

const router = express.Router();

/**
 * --- THE MASTER SCANNER (Final Stable Version) ---
 * Sabhi purani aur nayi PDFs ke liye optimized
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  // ✅ 1. CORS Fix: Browser block ko rokne ke liye
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  try {
    const { offerId } = req.params;
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ✅ 2. Gemini 3 Primary (Strict Mode): Temperature 0 taaki data mix na ho
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
    
    // ✅ 3. Universal Parsing: Sabhi formats ke liye
    if (ext.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      docText = result.value;
    } else if (ext.endsWith(".pdf")) {
      const data = await pdfParse(fileBuffer);
      docText = data.text;
    } else {
      docText = fileBuffer.toString('utf-8', 0, 12000);
    }

    // ✅ 4. Master Prompt: Sabhi patterns (SAV, Zain, Gameo) ko handle karne ke liye
    const prompt = `
      STRICT INSTRUCTION: Extract technical details ONLY from the provided text.
      Patterns to handle:
      - Clean placeholders: Convert #MSISDN#, {msisdn}, [msisdn] to {msisdn}.
      - Convert #ANDROIDID#, #TXID#, {click_id} to {transaction_id}.
      - Extract: pin_send_url, verify_pin_url, check_status_url, portal_url.
      - Capture: cid, sessionKey, pub_id, cmpid, confirm_button_id.

      Return ONLY a valid JSON object.
      CONTENT: ${docText.slice(0, 12000)}`;

    const result = await model.generateContent(prompt);
    let responseText = (await result.response).text();
    
    // ✅ 5. Safe JSON Parsing: "Unexpected token" error ka permanent ilaaj
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return a valid JSON");
    const aiConfig = JSON.parse(jsonMatch[0]);

    const urls = aiConfig.core_urls || {};
    
    // --- Database Updates ---
    await pool.query(
      `UPDATE offers SET pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4, has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
      [urls.pin_send_url || null, urls.verify_pin_url || null, urls.check_status_url || null, urls.portal_url || null, !!aiConfig.has_fraud, offerId]
    );

    const paramsMap = new Map();
    // Core URLs sync for UI display
    ['pin_send_url', 'verify_pin_url', 'check_status_url', 'portal_url'].forEach(k => {
        if(urls[k]) paramsMap.set(k, urls[k]);
    });

    // Extract all other technical params
    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v && v !== null && v !== "N/A") paramsMap.set(k.toLowerCase(), v);
      });
    }

    // ✅ 6. Null-Safety Loop: Database constraints fix
    for (const [key, val] of paramsMap.entries()) {
      if (val && val !== "") {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
           ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
          [offerId, key, val]
        );
      }
    }

    res.json({ success: true, message: "Mob13r-Robo: All Errors Fixed!", data: aiConfig });
  } catch (err) {
    console.error("Master Sync Error:", err);
    res.status(500).json({ error: "Sync Failed", details: err.message });
  }
});

/**
 * --- Runtime Engine (Fetch config for production) ---
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
