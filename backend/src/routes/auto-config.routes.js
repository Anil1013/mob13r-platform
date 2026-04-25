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
function safeParse(text) {
  try {
    text = text.replace(/```json|```/g, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

/* =========================
   🔥 SMART PLACEHOLDER FIX (FINAL)
========================= */
function fixUrl(url) {
  if (!url) return null;

  return url
    // msisdn variations
    .replace(/(\{)?(msisdn|mobile|phone|number)(\})?/gi, "{msisdn}")

    // otp variations
    .replace(/(\{)?(otp|pin|code)(\})?/gi, "{otp}")

    // transaction variations
    .replace(/(\{)?(transaction_id|transid|txnid|tid|clickid)(\})?/gi, "{transaction_id}")

    // session
    .replace(/(\{)?(sessionkey|session_key|session)(\})?/gi, "{sessionKey}")

    // publisher
    .replace(/(\{)?(pub_id|publisherid|partnerid|userid)(\})?/gi, "{pub_id}")

    // sub publisher
    .replace(/(\{)?(sub_pub_id|subid|sub_id)(\})?/gi, "{sub_pub_id}")

    // user agent
    .replace(/(\{)?(ua|user_agent)(\})?/gi, "{user_agent}")

    // ip
    .replace(/(\{)?(ip|user_ip)(\})?/gi, "{user_ip}")

    // fix masked values
    .replace(/=XXXXXXXXXX/gi, "={msisdn}")
    .replace(/=XXXX/gi, "={otp}");
}

/**
 * --- 1. MAIN ROUTE ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 FINAL AI SYNC for ID: ${offerId}`);

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      }
    });

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;

    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    let docText = "";
    const ext = file.name.toLowerCase();

    /* =========================
       TEXT PARSING (fallback)
    ========================= */
    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        const data = await pdfParse(fileBuffer);
        docText = data.text;
      } else {
        docText = fileBuffer.toString("utf-8", 0, 15000);
      }
    } catch {
      docText = fileBuffer.toString("utf-8", 0, 15000);
    }

    console.log("📄 TEXT LENGTH:", docText.length);

    /* =========================
       🔥 GEMINI OCR (MAIN FIX)
    ========================= */
    let aiConfig = null;

    try {
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: ext.endsWith(".pdf") ? "application/pdf" : "text/plain",
            data: fileBuffer.toString("base64")
          }
        },
        `
Extract AdTech API integration details.

Return ONLY JSON:

{
  "has_fraud": false,
  "fraud": {},
  "core_urls": {
    "pin_send_url": "",
    "verify_pin_url": "",
    "check_status_url": "",
    "portal_url": ""
  },
  "all_params": {}
}

Rules:
- send / generate / otp → pin_send_url
- verify / validate / confirm → verify_pin_url
- status / check → check_status_url
- redirect / success → portal_url
- normalize placeholders
`
      ]);

      aiConfig = safeParse(result.response.text());
      console.log("🤖 AI:", aiConfig);

    } catch (err) {
      console.log("AI failed:", err.message);
    }

    /* =========================
       FALLBACK (if AI fails)
    ========================= */
    if (!aiConfig || !aiConfig.core_urls) {
      console.log("⚠️ fallback extraction");

      const urls = docText.match(/https?:\/\/[^\s]+/g) || [];

      aiConfig = {
        has_fraud: false,
        core_urls: {
          pin_send_url: urls.find(u => /send|otp|generate/i.test(u)) || null,
          verify_pin_url: urls.find(u => /verify|validate|confirm/i.test(u)) || null,
          check_status_url: urls.find(u => /status|check/i.test(u)) || null,
          portal_url: urls.find(u => /portal|redirect|success/i.test(u)) || null,
        },
        all_params: {}
      };
    }

    const urls = aiConfig.core_urls || {};

    /* =========================
       🔥 PLACEHOLDER FIX APPLY
    ========================= */
    urls.pin_send_url = fixUrl(urls.pin_send_url);
    urls.verify_pin_url = fixUrl(urls.verify_pin_url);
    urls.check_status_url = fixUrl(urls.check_status_url);
    urls.portal_url = fixUrl(urls.portal_url);

    /* =========================
       DB UPDATE
    ========================= */
    await pool.query(
      `UPDATE offers SET 
        pin_send_url=$1,
        pin_verify_url=$2,
        check_status_url=$3,
        portal_url=$4,
        has_antifraud=$5,
        updated_at=NOW()
       WHERE id=$6`,
      [
        urls.pin_send_url,
        urls.verify_pin_url,
        urls.check_status_url,
        urls.portal_url,
        !!aiConfig.has_fraud,
        offerId
      ]
    );

    /* =========================
       PARAM SYNC
    ========================= */
    const paramsMap = new Map();

    Object.entries(urls).forEach(([k, v]) => {
      if (v) paramsMap.set(k, v);
    });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) =>
        paramsMap.set(k.toLowerCase(), v)
      );
    }

    for (const [key, val] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key)
         DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({
      success: true,
      message: "🔥 FINAL SUCCESS (Gemini 3 + SAV FIX)",
      data: aiConfig
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * --- 2. RUNTIME ENGINE ---
 */
router.get("/get-runtime-config/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
    const paramsRes = await pool.query("SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1", [offerId]);

    const config = {};
    paramsRes.rows.forEach(p => config[p.param_key] = p.param_value);

    res.json({
      success: true,
      offer: offerRes.rows[0],
      params: config,
      runtime: { transaction_id: `m13r_${Date.now()}` }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
