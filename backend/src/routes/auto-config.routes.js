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

    let docText = "";

    /* 🔥 TEXT EXTRACTION */
    if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: file.data });
      docText = result.value;
    } else if (file.name.endsWith(".pdf")) {
      const data = await pdf(file.data);
      docText = data.text;
    } else {
      return res.status(400).json({ error: "Only PDF/DOCX allowed" });
    }

    if (!docText || docText.length < 50) {
      return res.status(400).json({ error: "Empty or invalid document" });
    }

    /* 🔥 LIMIT TEXT */
    const safeText = docText.slice(0, 15000);

    /* 🔥 GENERIC AI PROMPT */
    const prompt = `
You are an API parser.

Analyze ANY API documentation and extract structured data.

Return ONLY JSON.

{
  "flow_type": "otp | pin | subscription | api | unknown",
  "steps": [
    {
      "name": "",
      "url": "",
      "method": "GET/POST",
      "type": "send | verify | check | redirect | other",
      "params": [
        { "key": "", "value": "" }
      ]
    }
  ],
  "has_antifraud": true/false
}

DOC:
${safeText}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);

    let raw = result.response.text();

    /* 🔥 CLEAN RESPONSE */
    raw = raw.replace(/```json|```/g, "").trim();

    let aiConfig;

    try {
      aiConfig = JSON.parse(raw);
    } catch (e) {
      console.error("AI JSON ERROR:", raw);
      return res.status(400).json({
        error: "AI returned invalid JSON",
        raw,
      });
    }

    /* 🔥 STEP DETECTION */
    const steps = aiConfig.steps || [];

    const sendStep = steps.find(s => ["send", "otp"].includes(s.type));
    const verifyStep = steps.find(s => ["verify", "validate"].includes(s.type));
    const checkStep = steps.find(s => ["check", "status"].includes(s.type));
    const redirectStep = steps.find(s => ["redirect", "portal"].includes(s.type));

    /* 🔥 UPDATE OFFER */
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1,
        pin_verify_url = $2,
        check_status_url = $3,
        portal_url = $4,
        has_antifraud = $5,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        sendStep?.url || null,
        verifyStep?.url || null,
        checkStep?.url || null,
        redirectStep?.url || null,
        !!aiConfig.has_antifraud,
        offerId,
      ]
    );

    /* 🔥 PARAMS MERGE */
    let allParams = [];

    steps.forEach(s => {
      if (Array.isArray(s.params)) {
        allParams.push(...s.params);
      }
    });

    const unique = {};

    allParams.forEach(p => {
      const key = p.key || p.param;
      if (!key) return;

      if (!unique[key]) {
        unique[key] = p.value || "";
      }
    });

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
      message: "Auto Integration Complete",
      data: aiConfig,
    });

  } catch (err) {
    console.error("AUTO INTEGRATE ERROR:", err);

    return res.status(500).json({
      error: "Integration Failed",
      details: err.message,
    });
  }
});

export default router;
