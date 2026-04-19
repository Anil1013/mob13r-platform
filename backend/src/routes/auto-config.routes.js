import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises"; 

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const router = express.Router();

/* ========================= */
/* AUTO INTEGRATE UNIVERSAL  */
/* ========================= */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Starting Universal AI Integration for Offer ID: ${offerId}`);

    // 1. Check AI Key
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing in Environment Variables");
      return res.status(500).json({ error: "Server Configuration Error: Missing AI Key" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 2. File Detection
    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) {
      return res.status(400).json({ error: "No document uploaded" });
    }

    console.log("📄 Processing File:", file.name);

    // 3. Robust Buffer Loading (AWS Fix)
    let fileBuffer;
    try {
      if (file.tempFilePath) {
        fileBuffer = await fs.readFile(file.tempFilePath);
      } else {
        fileBuffer = file.data;
      }
    } catch (fsErr) {
      console.error("❌ File System Error:", fsErr);
      return res.status(500).json({ error: "Failed to read uploaded file" });
    }

    // 4. Text Extraction
    let docText = "";
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      docText = result.value;
    } else if (fileName.endsWith(".pdf")) {
      const data = await pdf(fileBuffer);
      docText = data.text;
    } else {
      return res.status(400).json({ error: "Unsupported format. Use PDF or DOCX" });
    }

    if (!docText || docText.trim().length < 50) {
      return res.status(400).json({ error: "Document is too short or empty" });
    }

    // 5. AI Analysis
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { response_mime_type: "application/json" }
    });

    const prompt = `
      You are an expert API parser. Analyze the provided document and extract the integration flow.
      Identify URLs for PIN sending, verification, and status checks. 
      Identify Headers like Authorization, x-api-key, etc.
      Use placeholders: {msisdn}, {otp}, {transaction_id}.

      Return ONLY this JSON structure:
      {
        "flow_type": "otp | pin | subscription",
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

      DOC CONTENT:
      ${docText.slice(0, 18000)}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let aiConfig;
    try {
      // Find JSON block in case AI adds markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      aiConfig = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (parseErr) {
      console.error("🤖 AI Response Parsing Error:", responseText);
      return res.status(400).json({ error: "AI returned invalid data format" });
    }

    const steps = aiConfig.steps || [];

    // 6. Map Steps to Database Columns
    const findStep = (types) => steps.find(s => types.some(t => s.type?.toLowerCase().includes(t)));

    const sendStep = findStep(["send", "otp", "init", "subscribe"]);
    const verifyStep = findStep(["verify", "validate", "confirm"]);
    const checkStep = findStep(["check", "status"]);
    const redirectStep = findStep(["redirect", "portal", "product", "success"]);

    // 7. Update Offers Table
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, has_status_check = $6, has_portal_step = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        sendStep?.url || null, verifyStep?.url || null, checkStep?.url || null, redirectStep?.url || null,
        !!aiConfig.has_antifraud, !!checkStep, !!redirectStep, offerId
      ]
    );

    // 8. Extract and Save Parameters (Unique keys only)
    const paramsMap = new Map();

    steps.forEach(step => {
      // Process explicit params
      if (Array.isArray(step.params)) {
        step.params.forEach(p => {
          if (p.key) paramsMap.set(p.key.toLowerCase().trim(), p.value || "");
        });
      }
      // Process headers as params
      if (step.headers && typeof step.headers === 'object') {
        Object.entries(step.headers).forEach(([k, v]) => {
          paramsMap.set(k.toLowerCase().trim(), v || "");
        });
      }
    });

    for (const [key, value] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key)
         DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, value]
      );
    }

    console.log("✅ AI Integration Successful");
    return res.json({
      success: true,
      message: "Universal Integration Successful",
      data: aiConfig
    });

  } catch (err) {
    console.error("🔥 CRITICAL INTEGRATION ERROR:", err);
    return res.status(500).json({ 
      error: "Integration Engine Failed", 
      details: err.message 
    });
  }
});

export default router;
