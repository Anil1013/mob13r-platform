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

/* =========================
   OTP LENGTH DETECTOR
   (fallback if AI misses it)
========================= */
function detectOtpLength(docText) {
  // 6-digit check
  if (
    /6[\s-]?digit/i.test(docText) ||
    /pin.{0,20}6/i.test(docText) ||
    /otp.{0,20}6/i.test(docText) ||
    /6.{0,20}digit.{0,20}(pin|otp|code)/i.test(docText) ||
    /XXXXXX/.test(docText)
  ) {
    return 6;
  }
  // 5-digit check
  if (
    /5[\s-]?digit/i.test(docText) ||
    /XXXXX/.test(docText)
  ) {
    return 5;
  }
  // default 4
  return 4;
}

/* =========================
   ANTIFRAUD TYPE DETECTOR
   (fallback if AI misses it)
========================= */
function detectAntifraudType(docText) {
  if (
    /uniqid/i.test(docText) ||
    /DCBProtectRun/i.test(docText) ||
    /dns-prefetch.*dcbprotect/i.test(docText) ||
    /mcpuniqid/i.test(docText)
  ) {
    return "MCP";
  }
  if (
    /partnerId/i.test(docText) ||
    /sessionId/i.test(docText) ||
    /ua\.od-integrations/i.test(docText) ||
    /one97/i.test(docText)
  ) {
    return "ONE97";
  }
  if (
    /antifraud/i.test(docText) ||
    /anti.fraud/i.test(docText) ||
    /af_prepare/i.test(docText)
  ) {
    return "GENERIC";
  }
  return "NONE";
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
        `
You are an expert telecom API parser.

Extract ALL API URLs and integration details.

Return STRICT JSON only, no extra text:

{
  "has_fraud": false,
  "otp_length": 4,
  "antifraud_type": "NONE",
  "af_prepare_url": "",
  "has_status_check": false,
  "core_urls": {
    "pin_send_url": "",
    "verify_pin_url": "",
    "check_status_url": "",
    "portal_url": ""
  },
  "all_params": {}
}

Rules:
- send / generate / otp / pin_request → pin_send_url
- verify / validate / confirm → verify_pin_url
- status / check → check_status_url
- redirect / portal / success → portal_url
- NEVER return null if URL exists
- otp_length: look for "4-digit", "5-digit", "6-digit" mentions. Count X's in XXXX/XXXXX/XXXXXX placeholders. Default 4
- antifraud_type: 
    "MCP" if uniqid / DCBProtectRun / mcpuniqid / dns-prefetch dcbprotect found
    "ONE97" if partnerId / sessionId / ua.od-integrations / one97 found
    "GENERIC" if antifraud / af_prepare mentioned but no specific type
    "NONE" if no antifraud
- has_fraud: true if any antifraud/MCP/fraud script mentioned
- has_status_check: true if a status check URL exists
- af_prepare_url: URL used for antifraud preparation step if any
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
        otp_length: detectOtpLength(docText),
        antifraud_type: detectAntifraudType(docText),
        af_prepare_url: null,
        has_status_check: false,
        core_urls: {
          pin_send_url: urls.find(u => /send|otp|generate|pin|request/i.test(u)) || null,
          verify_pin_url: urls.find(u => /verify|validate|confirm/i.test(u)) || null,
          check_status_url: urls.find(u => /status|check/i.test(u)) || null,
          portal_url: urls.find(u => /portal|redirect|success/i.test(u)) || null,
        },
        all_params: {}
      };
    }

    /* =========================
       FALLBACK SAFETY NET
       (AI return kiya but fields miss ho sakti hain)
    ========================= */
    if (!aiConfig.otp_length) {
      aiConfig.otp_length = detectOtpLength(docText);
    }
    if (!aiConfig.antifraud_type) {
      aiConfig.antifraud_type = detectAntifraudType(docText);
    }
    if (aiConfig.has_fraud === undefined) {
      aiConfig.has_fraud = aiConfig.antifraud_type !== "NONE";
    }
    if (aiConfig.has_status_check === undefined) {
      aiConfig.has_status_check = !!(aiConfig.core_urls?.check_status_url);
    }

    const urls = aiConfig.core_urls || {};

    urls.pin_send_url    = fixUrl(urls.pin_send_url);
    urls.verify_pin_url  = fixUrl(urls.verify_pin_url);
    urls.check_status_url = fixUrl(urls.check_status_url);
    urls.portal_url      = fixUrl(urls.portal_url);

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
        otp_length=$6,
        has_status_check=$7,
        af_prepare_url=$8,
        updated_at=NOW()
       WHERE id=$9`,
      [
        urls.pin_send_url,
        urls.verify_pin_url,
        urls.check_status_url,
        urls.portal_url,
        !!aiConfig.has_fraud,
        aiConfig.otp_length || 4,
        !!aiConfig.has_status_check,
        aiConfig.af_prepare_url || null,
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
      data: {
        ...aiConfig,
        otp_length: aiConfig.otp_length,
        antifraud_type: aiConfig.antifraud_type,
        has_status_check: aiConfig.has_status_check,
        urls
      }
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
