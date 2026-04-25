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
    if (!text) return null;
    text = text.replace(/```json|```/g, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

/* =========================
   VALUE NORMALIZER
========================= */
function normalizeValue(key, val) {
  if (!val) return val;

  if (/^\d{8,15}$/.test(val)) {
    if (key.includes("msisdn")) return "{msisdn}";
    if (key.includes("otp")) return "{otp}";
  }

  return val;
}

/* =========================
   SAFE URL FIX (NO PATH DAMAGE)
========================= */
function fixUrl(url) {
  if (!url) return null;

  const [base, query] = url.split("?");
  if (!query) return url;

  let q = query;

  q = q
    .replace(/(msisdn|mobile|phone|number)=([^&]*)/gi, "msisdn={msisdn}")
    .replace(/(otp|pin|code)=([^&]*)/gi, "otp={otp}")
    .replace(/(transaction_id|transid|txnid|tid|clickid)=([^&]*)/gi, "transaction_id={transaction_id}")
    .replace(/(sessionkey|session_key|session)=([^&]*)/gi, "sessionKey={sessionKey}")
    .replace(/(pub_id|publisherid|partnerid|userid)=([^&]*)/gi, "pub_id={pub_id}")
    .replace(/(sub_pub_id|subid|sub_id)=([^&]*)/gi, "sub_pub_id={sub_pub_id}")
    .replace(/(ip|user_ip)=([^&]*)/gi, "user_ip={user_ip}")
    .replace(/(ua|user_agent)=([^&]*)/gi, "user_agent={user_agent}")

    // numeric fallback
    .replace(/=\d{8,15}/gi, "={msisdn}")
    .replace(/=XXXX/gi, "={otp}");

  return `${base}?${q}`;
}

/**
 * =========================
 * MAIN ROUTE
 * =========================
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 FINAL AI SYNC for ID: ${offerId}`);

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

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

    if (!file) {
      return res.status(400).json({ error: "No document uploaded" });
    }

    let fileBuffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    let docText = "";
    const ext = file.name.toLowerCase();

    /* =========================
       TEXT EXTRACTION
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

    console.log("📄 TEXT SAMPLE:", docText.slice(0, 500));

    /* =========================
       GEMINI AI
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
You are an expert telecom API parser.

Extract ALL API URLs.

Return STRICT JSON:

{
  "has_fraud": false,
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
- verify / validate → verify_pin_url
- status → check_status_url
- redirect → portal_url
- NEVER return null if URL exists
`
      ]);

      const rawText =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";

      console.log("🔥 RAW AI:", rawText);

      aiConfig = safeParse(rawText);

    } catch (err) {
      console.log("❌ AI failed:", err.message);
    }

    /* =========================
       FALLBACK
    ========================= */
    if (!aiConfig || !aiConfig.core_urls) {
      console.log("⚠️ USING FALLBACK");

      const urls = docText.match(/https?:\/\/[^\s"']+/g) || [];

      console.log("📡 FALLBACK URLS:", urls);

      aiConfig = {
        has_fraud: false,
        core_urls: {
          pin_send_url: urls.find(u => /send|otp|generate|pin/i.test(u)) || null,
          verify_pin_url: urls.find(u => /verify|validate|confirm/i.test(u)) || null,
          check_status_url: urls.find(u => /status|check/i.test(u)) || null,
          portal_url: urls.find(u => /portal|redirect|success/i.test(u)) || null,
        },
        all_params: {}
      };
    }

    const urls = aiConfig.core_urls || {};

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
        paramsMap.set(k.toLowerCase(), normalizeValue(k, v))
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
      message: "🔥 FINAL STABLE WORKING",
      data: aiConfig
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
