import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();

router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // ✅ STABLE MODEL
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0 }
    });

    // ✅ FILE DETECTION (UNIVERSAL)
    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) {
      return res.status(400).json({ error: "No document uploaded" });
    }

    let buffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    let docText = "";

    if (file.name.toLowerCase().endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      docText = result.value;
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      docText = data.text;
    } else {
      docText = buffer.toString("utf-8");
    }

    if (!docText || docText.length < 50) {
      return res.status(400).json({ error: "Invalid document" });
    }

    const prompt = `
Return ONLY valid JSON.

{
  "pin_send_url": "",
  "pin_verify_url": "",
  "check_status_url": "",
  "portal_url": "",
  "params": {}
}

Text:
${docText.slice(0, 8000)}
`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text();

    console.log("🤖 RAW:", raw);

    // ✅ CLEAN JSON
    raw = raw.replace(/```json|```/g, "").trim();

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(400).json({ error: "Invalid AI response", raw });
    }

    let aiConfig;
    try {
      aiConfig = JSON.parse(match[0]);
    } catch (e) {
      return res.status(400).json({ error: "JSON parse failed", raw });
    }

    // ✅ URL MAPPING SAFE
    const sendUrl = aiConfig.pin_send_url || null;
    const verifyUrl = aiConfig.pin_verify_url || null;
    const checkUrl = aiConfig.check_status_url || null;
    const portalUrl = aiConfig.portal_url || null;

    // ✅ DB UPDATE
    await pool.query(
      `UPDATE offers 
       SET pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4, updated_at=NOW()
       WHERE id=$5`,
      [sendUrl, verifyUrl, checkUrl, portalUrl, offerId]
    );

    // ✅ PARAMS INSERT
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
      message: "Auto Integration Complete",
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
