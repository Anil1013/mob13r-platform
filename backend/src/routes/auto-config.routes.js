import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises"; 

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const router = express.Router();

router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🤖 Mob13r-Robo Logic Started for Offer: ${offerId}`);

    // 1. Initialize AI with GEMINI-3-FLASH-PREVIEW
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY in AWS Environment");
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview" 
    });

    // 2. File Detection & Buffer Loading (AWS Safe)
    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    console.log(`📄 Processing: ${file.name}`);
    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    
    // 3. Text Extraction
    let docText = "";
    const ext = file.name.toLowerCase();
    if (ext.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      docText = result.value;
    } else if (ext.endsWith(".pdf")) {
      const data = await pdf(fileBuffer);
      docText = data.text;
    } else {
      return res.status(400).json({ error: "Use PDF or DOCX only" });
    }

    // 4. AI Prompt (Optimized for Mob13r-Robo Style)
    const prompt = `
      Extract API integration details from the provided document.
      Return ONLY valid JSON.
      Placeholders: {msisdn}, {otp}, {transaction_id}.

      Structure:
      {
        "flow_type": "string",
        "steps": [
          {
            "name": "string",
            "url": "string",
            "method": "GET | POST",
            "type": "send | verify | check | redirect",
            "headers": { "Key": "Value" },
            "params": [{ "key": "string", "value": "string" }]
          }
        ],
        "has_antifraud": boolean
      }

      CONTENT:
      ${docText.slice(0, 16000)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().replace(/```json|```/g, "").trim();

    // JSON Cleaning
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const aiConfig = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    const steps = aiConfig.steps || [];
    const getStep = (types) => steps.find(s => types.some(t => s.type?.toLowerCase().includes(t)));

    // 5. Update Offers Table
    const sendS = getStep(["send", "otp", "init"]);
    const verifyS = getStep(["verify", "confirm"]);
    const checkS = getStep(["check", "status"]);
    const redirectS = getStep(["redirect", "portal", "success"]);

    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, has_status_check = $6, has_portal_step = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        sendS?.url || null, verifyS?.url || null, checkS?.url || null, redirectS?.url || null,
        !!aiConfig.has_antifraud, !!checkS, !!redirectS, offerId
      ]
    );

    // 6. Parameters & Headers Extraction (Merge into offer_parameters)
    const paramsMap = new Map();
    steps.forEach(step => {
      if (Array.isArray(step.params)) {
        step.params.forEach(p => { if (p.key) paramsMap.set(p.key.toLowerCase().trim(), p.value || ""); });
      }
      if (step.headers) {
        Object.entries(step.headers).forEach(([k, v]) => { paramsMap.set(k.toLowerCase().trim(), v || ""); });
      }
    });

    for (const [key, val] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key)
         DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({ success: true, message: "Mob13r-Robo Integration Successful!", data: aiConfig });

  } catch (err) {
    console.error("❌ Mob13r-Robo Error:", err.message);
    res.status(500).json({ error: "Integration Failed", details: err.message });
  }
});

export default router;
