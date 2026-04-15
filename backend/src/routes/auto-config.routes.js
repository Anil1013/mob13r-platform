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

    /* 🔥 UNIVERSAL FILE DETECTION (FIXED) */
    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) {
      return res.status(400).json({
        error: "No document uploaded",
        receivedKeys: fileKeys
      });
    }

    console.log("📄 FILE:", file.name);

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

    console.log("📄 DOC LENGTH:", docText.length);

    const safeText = docText.slice(0, 20000);

    /* 🔥 AI PROMPT */
    const prompt = `
Return ONLY valid JSON. No explanation.

{
  "flow_type": "string",
  "steps": [
    {
      "name": "string",
      "url": "string",
      "method": "GET | POST",
      "type": "send | verify | check | redirect",
      "headers": {},
      "params": []
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

    console.log("🤖 RAW AI:", raw);

    /* 🔥 CLEAN RESPONSE */
    raw = raw.replace(/```json|```/g, "").trim();

    /* 🔥 SAFE JSON EXTRACTION */
    let jsonString = "";

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(400).json({
        error: "AI JSON extraction failed",
        raw
      });
    }

    jsonString = match[0];

    let aiConfig;

    try {
      aiConfig = JSON.parse(jsonString);
    } catch (e) {
      return res.status(400).json({
        error: "Invalid JSON from AI",
        raw: jsonString
      });
    }

    /* 🔥 FALLBACK (CRASH PROTECTION) */
    if (!aiConfig || typeof aiConfig !== "object") {
      return res.json({
        success: true,
        message: "Fallback applied",
        data: { flow_type: "unknown", steps: [] }
      });
    }

    const steps = Array.isArray(aiConfig.steps) ? aiConfig.steps : [];

    /* 🔥 STEP DETECTION */
    const matchType = (types, s) =>
      types.some(t => (s?.type || "").toLowerCase().includes(t));

    const sendStep = steps.find(s =>
      matchType(["send", "otp", "generate", "init"], s)
    );

    const verifyStep = steps.find(s =>
      matchType(["verify", "validate", "confirm"], s)
    );

    const checkStep = steps.find(s =>
      matchType(["check", "status"], s)
    );

    const redirectStep = steps.find(s =>
      matchType(["redirect", "portal", "product"], s)
    );

    const getUrl = (step) => step?.url || null;

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

    /* 🔥 PARAMS MERGE */
    let allParams = [];

    steps.forEach(s => {
      if (Array.isArray(s.params)) {
        allParams.push(...s.params);
      }

      if (s.headers && typeof s.headers === "object") {
        Object.entries(s.headers).forEach(([k, v]) => {
          allParams.push({ key: k, value: v });
        });
      }
    });

    const unique = {};

    allParams.forEach(p => {
      const key = (p.key || "").toLowerCase().trim();
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
      message: "Auto Integration Successful",
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
