import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ========================= */
/* AUTO INTEGRATE GENERIC   */
/* ========================= */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    /* 🔥 FLEXIBLE FILE */
    const file = req.files?.doc || req.files?.file;

    if (!file) {
      return res.status(400).json({ error: "No document uploaded" });
    }

    console.log("📄 FILE:", file.name, file.mimetype);

    let docText = "";

    /* 🔥 TEXT EXTRACTION */
    if (file.name.toLowerCase().endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: file.data });
      docText = result.value;
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      const data = await pdf(file.data);
      docText = data.text;
    } else {
      return res.status(400).json({ error: "Only PDF/DOCX allowed" });
    }

    if (!docText || docText.length < 50) {
      return res.status(400).json({ error: "Empty or invalid document" });
    }

    /* 🔥 LIMIT TEXT (SAFE) */
    const safeText = docText.slice(0, 20000);

    /* 🔥 UNIVERSAL AI PROMPT */
    const prompt = `
You are an expert API integration parser.

Analyze ANY API documentation and extract structured data.

Return ONLY valid JSON. No explanation.

{
  "flow_type": "otp | pin | subscription | api | unknown",
  "steps": [
    {
      "name": "string",
      "url": "string",
      "method": "GET | POST",
      "type": "send | verify | check | redirect | subscribe | other",
      "headers": {
        "Authorization": "",
        "api_key": ""
      },
      "params": [
        { "key": "string", "value": "string" }
      ]
    }
  ],
  "has_antifraud": true/false
}

Rules:
- Extract ALL endpoints
- Extract ALL params
- Extract Authorization / API keys
- Detect flow automatically
- Use placeholders: {msisdn}, {otp}, {transaction_id}

DOC:
${safeText}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);

    let raw = result.response.text();

    console.log("🤖 RAW AI:", raw);

    /* 🔥 CLEAN RESPONSE */
    raw = raw.replace(/```json|```/g, "").trim();

    let aiConfig;

    try {
      aiConfig = JSON.parse(raw);
    } catch (e) {
      console.error("❌ AI JSON ERROR:", raw);

      return res.status(400).json({
        error: "Invalid AI JSON",
        raw,
      });
    }

    const steps = aiConfig.steps || [];

    /* 🔥 STRONG STEP DETECTION */
    const match = (types, s) =>
      types.some(t => s?.type?.toLowerCase()?.includes(t));

    const sendStep = steps.find(s =>
      match(["send", "otp", "generate", "initiate", "subscribe"], s)
    );

    const verifyStep = steps.find(s =>
      match(["verify", "validate", "confirm"], s)
    );

    const checkStep = steps.find(s =>
      match(["check", "status", "lookup"], s)
    );

    const redirectStep = steps.find(s =>
      match(["redirect", "portal", "product", "success"], s)
    );

    /* 🔥 SAFE URL PICKER */
    const getUrl = (step) => {
      if (!step) return null;
      return step.url || step.endpoint || null;
    };

    /* 🔥 UPDATE OFFER */
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1,
        pin_verify_url = $2,
        check_status_url = $3,
        portal_url = $4,
        has_antifraud = $5,
        has_status_check = $6,
        has_portal_step = $7,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        getUrl(sendStep),
        getUrl(verifyStep),
        getUrl(checkStep),
        getUrl(redirectStep),
        !!aiConfig.has_antifraud,
        !!checkStep,
        !!redirectStep,
        offerId,
      ]
    );

    /* 🔥 MERGE PARAMS + HEADERS */
    let allParams = [];

    steps.forEach(s => {
      if (Array.isArray(s.params)) {
        allParams.push(...s.params);
      }

      if (s.headers) {
        Object.entries(s.headers).forEach(([k, v]) => {
          allParams.push({ key: k, value: v });
        });
      }
    });

    /* 🔥 UNIQUE PARAMS */
    const unique = {};

    allParams.forEach(p => {
      let key = (p.key || p.param || "").toLowerCase().trim();
      if (!key) return;

      if (!unique[key]) {
        unique[key] = p.value || "";
      }
    });

    /* 🔥 INSERT PARAMS */
    for (const key in unique) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key)
         DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, unique[key]]
      );
    }

    return res.json({
      success: true,
      message: "Universal Auto Integration Complete",
      data: aiConfig,
    });

  } catch (err) {
    console.error("🔥 AUTO INTEGRATE ERROR:", err);

    return res.status(500).json({
      error: "Integration Failed",
      details: err.message,
    });
  }
});

export default router;
