import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let pdfParse;
try {
  const rawPdf = require("pdf-parse");
  pdfParse = typeof rawPdf === "function" ? rawPdf : rawPdf.default;
} catch (e) {
  console.warn("⚠️ pdf-parse load failed");
}

const router = express.Router();

/* =========================
   🚀 MAIN ROUTE
========================= */
router.post("/auto-integrate/:offerId", async (req, res) => {
  const { offerId } = req.params;

  res.header("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.sendStatus(200);

  console.log("📥 Request received for offer:", offerId);

  // instant response
  res.json({
    success: true,
    message: "🚀 AI processing started in background"
  });

  // background
  processIntegration(req, offerId);
});

/* =========================
   🧠 BACKGROUND PROCESS
========================= */
async function processIntegration(req, offerId) {
  try {
    console.log("🚀 START processing:", offerId);

    if (!process.env.GEMINI_API_KEY) {
      console.log("❌ Missing GEMINI_API_KEY");
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    let model;
    try {
      model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        generationConfig: { temperature: 0 }
      });
    } catch {
      model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0 }
      });
    }

    /* ========= FILE ========= */
    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) {
      console.log("❌ No file found");
      return;
    }

    console.log("📄 File received:", file.name);

    let buffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    let docText = "";
    const ext = file.name.toLowerCase();

    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        try {
          const data = pdfParse ? await pdfParse(buffer) : null;

          if (data && data.text && data.text.trim().length > 50) {
            docText = data.text;
          } else {
            console.log("⚠️ PDF weak text, fallback used");
            docText = buffer.toString("utf-8", 0, 15000);
          }
        } catch {
          console.log("⚠️ PDF parse failed");
          docText = buffer.toString("utf-8", 0, 15000);
        }
      } else {
        docText = buffer.toString("utf-8");
      }
    } catch (e) {
      console.log("⚠️ Parsing error:", e.message);
      docText = buffer.toString("utf-8", 0, 15000);
    }

    console.log("📄 Extracted text preview:", docText.slice(0, 500));

    if (!docText || docText.length < 30) {
      console.log("❌ Empty document");
      return;
    }

    /* ========= AI ========= */
    const prompt = `
Extract telecom API URLs.

Return JSON:

{
  "pin_send_url": "",
  "pin_verify_url": "",
  "check_status_url": "",
  "portal_url": "",
  "params": {}
}

TEXT:
${docText.slice(0, 10000)}
`;

    console.log("🤖 Calling Gemini...");

    const result = await model.generateContent(prompt);

    let raw = result.response.text();
    console.log("🤖 RAW AI:", raw);

    raw = raw.replace(/```json|```/g, "").trim();

    const match = raw.match(/\{[\s\S]*\}/);

    if (!match) {
      console.log("❌ AI JSON not found");
      return;
    }

    let aiConfig;
    try {
      aiConfig = JSON.parse(match[0]);
    } catch (e) {
      console.log("❌ JSON parse failed:", e.message);
      return;
    }

    console.log("✅ Parsed AI config:", aiConfig);

    /* ========= DB ========= */
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

    console.log("💾 DB updated for:", offerId);

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

    console.log("🎉 DONE:", offerId);

  } catch (err) {
    console.error("❌ Background crash:", err);
  }
}

export default router;
