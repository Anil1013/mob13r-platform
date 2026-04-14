import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";

// 🔥 Mechanical Fix: pdf-parse import for ES Modules (Crash rokne ke liye)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    /* Aapka Original Flexible File Detection */
    const file = req.files?.doc || req.files?.file;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let docText = "";

    /* Aapka Original Text Extraction Logic */
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

    const safeText = docText.slice(0, 15000);

    /* 🔥 Universal Prompt: Ab ye kisi bhi service ke headers aur params nikal lega */
    const prompt = `
      Analyze this API documentation for ANY VAS service.
      Extract ALL technical steps and return ONLY JSON.
      Instruction: Look for any 'Authorization' headers or API keys and include them in params.
      Placeholders: Use {msisdn}, {otp}, {transaction_id}.

      {
        "flow_type": "string",
        "steps": [
          {
            "name": "string",
            "url": "string",
            "method": "POST/GET",
            "type": "send | verify | check | redirect",
            "params": [{ "key": "string", "value": "string" }]
          }
        ],
        "has_antifraud": boolean
      }

      DOC: ${safeText}
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { response_mime_type: "application/json" }
    });

    const result = await model.generateContent(prompt);
    let raw = result.response.text().replace(/```json|```/g, "").trim();

    let aiConfig = JSON.parse(raw);

    /* Aapka Original Step Detection Logic */
    const steps = aiConfig.steps || [];
    const sendStep = steps.find(s => ["send", "otp"].includes(s.type));
    const verifyStep = steps.find(s => ["verify", "validate"].includes(s.type));
    const checkStep = steps.find(s => ["check", "status"].includes(s.type));
    const redirectStep = steps.find(s => ["redirect", "portal", "product"].includes(s.type));

    /* Aapka Original Update Logic + Auto-Flags */
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
        sendStep?.url || null,
        verifyStep?.url || null,
        checkStep?.url || null,
        redirectStep?.url || null,
        !!aiConfig.has_antifraud,
        !!checkStep,    // Auto-detect check status
        !!redirectStep, // Auto-detect portal step
        offerId,
      ]
    );

    /* Aapka Original Params Merge & Insertion Logic */
    let allParams = [];
    steps.forEach(s => {
      if (Array.isArray(s.params)) allParams.push(...s.params);
    });

    const unique = {};
    allParams.forEach(p => {
      const key = p.key || p.param;
      if (!key) return;
      if (!unique[key]) unique[key] = p.value || "";
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
      message: "Universal Auto Integration Complete",
      data: aiConfig,
    });

  } catch (err) {
    console.error("AUTO INTEGRATE ERROR:", err);
    return res.status(500).json({ error: "Integration Failed", details: err.message });
  }
});

export default router;
