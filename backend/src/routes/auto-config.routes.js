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

  console.log("📥 Request received:", offerId);

  try {
    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // ✅ IMPORTANT: extract buffer BEFORE async
    const buffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    const fileName = file.name;

    // instant response
    res.json({
      success: true,
      message: "🚀 AI processing started"
    });

    // 🔥 background (SAFE DATA PASS)
    processIntegration(buffer, fileName, offerId);

  } catch (err) {
    console.error("❌ Route error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* =========================
   🧠 BACKGROUND PROCESS
========================= */
async function processIntegration(buffer, fileName, offerId) {
  try {
    console.log("🚀 START:", offerId);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: { temperature: 0 }
    });

    let docText = "";
    const ext = fileName.toLowerCase();

    if (ext.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      docText = result.value;
    }

    else if (ext.endsWith(".pdf")) {
      try {
        const data = pdfParse ? await pdfParse(buffer) : null;
        docText = data?.text || buffer.toString("utf-8", 0, 15000);
      } catch {
        docText = buffer.toString("utf-8", 0, 15000);
      }
    }

    else {
      docText = buffer.toString("utf-8");
    }

    console.log("📄 Text preview:", docText.slice(0, 300));

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

    const result = await model.generateContent(prompt);

    let raw = result.response.text();
    console.log("🤖 RAW AI:", raw);

    raw = raw.replace(/```json|```/g, "").trim();

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.log("❌ AI invalid");
      return;
    }

    const aiConfig = JSON.parse(match[0]);

    await pool.query(
      `UPDATE offers 
       SET pin_send_url=$1,
           pin_verify_url=$2,
           check_status_url=$3,
           portal_url=$4
       WHERE id=$5`,
      [
        aiConfig.pin_send_url || null,
        aiConfig.pin_verify_url || null,
        aiConfig.check_status_url || null,
        aiConfig.portal_url || null,
        offerId
      ]
    );

    console.log("✅ DONE:", offerId);

  } catch (err) {
    console.error("❌ Crash:", err);
  }
}

export default router;
