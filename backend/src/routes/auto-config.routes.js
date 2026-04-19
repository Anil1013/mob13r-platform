import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises"; // 🔥 Badi files read karne ke liye added

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ========================= */
/* AUTO INTEGRATE GENERIC    */
/* ========================= */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    /* 🔥 UNIVERSAL FILE DETECTION */
    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) {
      return res.status(400).json({
        error: "No document uploaded",
        receivedKeys: fileKeys
      });
    }

    console.log("📄 FILE RECEIVED:", file.name);

    let docText = "";
    let fileBuffer;

    /* 🔥 AWS TEMP FILE HANDLING (Fix for Corrupted Zip/Empty Data) */
    if (file.tempFilePath) {
      // Agar file badi hai (1MB+), AWS use temp path par rakhta hai
      fileBuffer = await fs.readFile(file.tempFilePath);
    } else {
      // Choti files direct memory mein hoti hain
      fileBuffer = file.data;
    }

    /* 🔥 TEXT EXTRACTION */
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      docText = result.value;
    } else if (fileName.endsWith(".pdf")) {
      const data = await pdf(fileBuffer);
      docText = data.text;
    } else {
      return res.status(400).json({ error: "Only PDF/DOCX allowed" });
    }

    if (!docText || docText.trim().length < 50) {
      return res.status(400).json({ error: "Empty or invalid document" });
    }

    console.log("📄 DOC EXTRACTED. LENGTH:", docText.length);

    const safeText = docText.slice(0, 20000);

    /* 🔥 AI PROMPT (Improved for Headers & Params) */
    const prompt = `
      Return ONLY valid JSON. No explanation.
      Extract API endpoints, Headers (Authorization), and Parameters.
      Use placeholders: {msisdn}, {otp}, {transaction_id}.

      {
        "flow_type": "string",
        "steps": [
          {
            "name": "string",
            "url": "string",
            "method": "GET | POST",
            "type": "send | verify | check | redirect",
            "headers": {},
            "params": [{ "key": "string", "value": "string" }]
          }
        ],
        "has_antifraud": boolean
      }

      DOC:
      ${safeText}
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { response_mime_type: "application/json" }
    });

    const result = await model.generateContent(prompt);
    let raw = result.response.text().replace(/```json|```/g, "").trim();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI JSON extraction failed");

    const aiConfig = JSON.parse(jsonMatch[0]);

    const steps = Array.isArray(aiConfig.steps) ? aiConfig.steps : [];

    /* 🔥 STEP DETECTION */
    const matchType = (types, s) =>
      types.some(t => (s?.type || "").toLowerCase().includes(t));

    const sendStep = steps.find(s => matchType(["send", "otp", "init", "subscribe"], s));
    const verifyStep = steps.find(s => matchType(["verify", "validate", "confirm"], s));
    const checkStep = steps.find(s => matchType(["check", "status"], s));
    const redirectStep = steps.find(s => matchType(["redirect", "portal", "product"], s));

    const getUrl = (step) => step?.url || null;

    /* 🔥 UPDATE OFFER */
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, has_status_check = $6, has_portal_step = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        getUrl(sendStep), getUrl(verifyStep), getUrl(checkStep), getUrl(redirectStep),
        !!aiConfig.has_antifraud, !!checkStep, !!redirectStep, offerId
      ]
    );

    /* 🔥 PARAMS MERGE (Headers + Params) */
    const unique = {};
    steps.forEach(s => {
      if (Array.isArray(s.params)) {
        s.params.forEach(p => { if (p.key) unique[p.key.toLowerCase().trim()] = p.value || ""; });
      }
      if (s.headers && typeof s.headers === "object") {
        Object.entries(s.headers).forEach(([k, v]) => { unique[k.toLowerCase().trim()] = v || ""; });
      }
    });

    for (const [key, val] of Object.entries(unique)) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key)
         DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({ success: true, message: "Auto Integration Successful", data: aiConfig });

  } catch (err) {
    console.error("🔥 AUTO INTEGRATE ERROR:", err);
    res.status(500).json({ error: "Integration Failed", details: err.message });
  }
});

export default router;
