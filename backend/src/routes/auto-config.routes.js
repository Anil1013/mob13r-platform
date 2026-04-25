import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();

/* =========================
   SAFE JSON PARSER
========================= */
function safeParseJSON(text) {
  try {
    text = text.replace(/```json|```/g, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

/* =========================
   FALLBACK URL EXTRACTOR
========================= */
function extractUrls(text) {
  const urls = text.match(/https?:\/\/[^\s]+/g) || [];
  return {
    pin_send_url: urls.find(u => u.toLowerCase().includes("send") || u.includes("otp")) || null,
    verify_pin_url: urls.find(u => u.toLowerCase().includes("verify")) || null,
    check_status_url: urls.find(u => u.toLowerCase().includes("status")) || null,
    portal_url: urls.find(u => u.toLowerCase().includes("success")) || null
  };
}

/* =========================
   MAIN ROUTE
========================= */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    } catch {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) return res.status(400).json({ error: "No document uploaded" });

    const buffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    let docText = "";
    const ext = file.name.toLowerCase();

    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        const data = await pdfParse(buffer);
        docText = data.text;
      } else {
        docText = buffer.toString("utf-8", 0, 15000);
      }
    } catch {
      docText = buffer.toString("utf-8", 0, 15000);
    }

    /* =========================
       GEMINI PROMPT
    ========================= */
    const prompt = `
Extract telecom API integration.

Return ONLY JSON:

{
  "core_urls": {
    "pin_send_url": "",
    "verify_pin_url": "",
    "check_status_url": "",
    "portal_url": ""
  },
  "all_params": {}
}

TEXT:
${docText.slice(0, 15000)}
`;

    let aiConfig = null;

    try {
      const result = await model.generateContent(prompt);
      const raw = await result.response.text();

      console.log("🤖 RAW AI:", raw);

      aiConfig = safeParseJSON(raw);
    } catch (err) {
      console.log("AI failed:", err.message);
    }

    /* =========================
       FALLBACK (VERY IMPORTANT)
    ========================= */
    if (!aiConfig || !aiConfig.core_urls) {
      console.log("⚠️ Using fallback extraction");

      const fallbackUrls = extractUrls(docText);

      aiConfig = {
        core_urls: fallbackUrls,
        all_params: {}
      };
    }

    /* =========================
       PLACEHOLDER FIX
    ========================= */
    const fixPlaceholders = (url) => {
      if (!url) return null;
      return url
        .replace(/\{?msisdn\}?/gi, "{msisdn}")
        .replace(/\{?otp\}?/gi, "{otp}")
        .replace(/\{?transaction_id\}?/gi, "{transaction_id}");
    };

    const urls = aiConfig.core_urls || {};

    urls.pin_send_url = fixPlaceholders(urls.pin_send_url);
    urls.verify_pin_url = fixPlaceholders(urls.verify_pin_url);
    urls.check_status_url = fixPlaceholders(urls.check_status_url);
    urls.portal_url = fixPlaceholders(urls.portal_url);

    /* =========================
       DB UPDATE
    ========================= */
    await pool.query(
      `UPDATE offers SET 
        pin_send_url=$1,
        pin_verify_url=$2,
        check_status_url=$3,
        portal_url=$4,
        updated_at=NOW()
       WHERE id=$5`,
      [
        urls.pin_send_url,
        urls.verify_pin_url,
        urls.check_status_url,
        urls.portal_url,
        offerId
      ]
    );

    /* =========================
       PARAMS SYNC
    ========================= */
    for (const [key, val] of Object.entries(urls)) {
      if (!val) continue;

      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1,$2,$3)
         ON CONFLICT (offer_id, param_key)
         DO UPDATE SET param_value=EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({
      success: true,
      message: "✅ FINAL: Integration success",
      data: aiConfig
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
