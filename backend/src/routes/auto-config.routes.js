import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import Tesseract from "tesseract.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let pdfParse;
try {
  const rawPdf = require("pdf-parse");
  pdfParse = typeof rawPdf === "function" ? rawPdf : rawPdf.default;
} catch (e) {
  console.warn("⚠️ pdf-parse load failed, OCR only mode");
}

const router = express.Router();

router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ Gemini 3 + fallback
    let model;
    try {
      model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0 }
      });
    } catch (e) {
      model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0 }
      });
    }

    // ✅ File extract
    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) {
      return res.status(400).json({ error: "No document uploaded" });
    }

    let buffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    let docText = "";
    const ext = file.name.toLowerCase();

    // =========================
    // 📄 FILE PARSING
    // =========================
    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        docText = result.value;
      }

      else if (ext.endsWith(".pdf")) {
        try {
          const data = pdfParse ? await pdfParse(buffer) : null;

          if (data && data.text && data.text.trim().length > 50) {
            docText = data.text;
          } else {
            console.log("⚠️ Using OCR for PDF...");
            const ocr = await Tesseract.recognize(buffer, "eng");
            docText = ocr.data.text;
          }
        } catch (e) {
          console.log("⚠️ PDF parse failed → OCR fallback");
          const ocr = await Tesseract.recognize(buffer, "eng");
          docText = ocr.data.text;
        }
      }

      else {
        docText = buffer.toString("utf-8");
      }

    } catch (err) {
      console.log("⚠️ Parsing fallback");
      docText = buffer.toString("utf-8");
    }

    if (!docText || docText.length < 50) {
      return res.status(400).json({ error: "Invalid document / empty text" });
    }

    // =========================
    // 🤖 GEMINI PROMPT
    // =========================
    const prompt = `
You are an AdTech integration expert.

Extract ONLY valid JSON:

{
  "pin_send_url": "",
  "pin_verify_url": "",
  "check_status_url": "",
  "portal_url": "",
  "params": {}
}

Rules:
- detect all URLs correctly
- replace dynamic values with {msisdn}, {otp}, {transaction_id}
- include query params

TEXT:
${docText.slice(0, 12000)}
`;

    const result = await model.generateContent(prompt);

    let raw = result.response.text();

    console.log("🤖 RAW AI:", raw);

    // =========================
    // 🧹 CLEAN JSON
    // =========================
    raw = raw.replace(/```json|```/g, "").trim();

    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      return res.status(400).json({
        error: "AI did not return valid JSON",
        raw
      });
    }

    let aiConfig;
    try {
      aiConfig = JSON.parse(match[0]);
    } catch (e) {
      return res.status(400).json({
        error: "Invalid JSON from AI",
        raw: match[0]
      });
    }

    // =========================
    // 💾 DB UPDATE
    // =========================
    await pool.query(
      `UPDATE offers 
       SET pin_send_url=$1, 
           pin_verify_url=$2, 
           check_status_url=$3, 
           portal_url=$4,
           updated_at=NOW()
       WHERE id=$5`,
      [
        aiConfig.pin_send_url || null,
        aiConfig.pin_verify_url || null,
        aiConfig.check_status_url || null,
        aiConfig.portal_url || null,
        offerId
      ]
    );

    // =========================
    // 🔁 PARAMS INSERT
    // =========================
    const params = aiConfig.params || {};

    for (const key in params) {
      const val = params[key];
      if (!val) continue;

      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1,$2,$3)
         ON CONFLICT (offer_id, param_key)
         DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key.toLowerCase(), val]
      );
    }

    return res.json({
      success: true,
      message: "✅ Auto Integration Complete",
      data: aiConfig
    });

  } catch (err) {
    console.error("❌ ERROR:", err);

    return res.status(500).json({
      error: "Integration failed",
      details: err.message
    });
  }
});

export default router;
