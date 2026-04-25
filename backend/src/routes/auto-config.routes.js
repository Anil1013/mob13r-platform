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
   🔥 SMART PLACEHOLDER FIX (CLEANED)
========================= */
function fixUrl(url) {
  if (!url) return null;

  let fixed = url
    // Normalize variations to {standard_key}
    .replace(/(\{+)?(msisdn|mobile|phone|number)(\}+)?/gi, "{msisdn}")
    .replace(/(\{+)?(otp|pin|code)(\}+)?/gi, "{otp}")
    .replace(/(\{+)?(transaction_id|transid|txnid|tid|clickid)(\}+)?/gi, "{transaction_id}")
    .replace(/(\{+)?(sessionkey|session_key|session)(\}+)?/gi, "{sessionKey}")
    .replace(/(\{+)?(pub_id|publisherid|partnerid|userid)(\}+)?/gi, "{pub_id}")
    .replace(/(\{+)?(sub_pub_id|subid|sub_id)(\}+)?/gi, "{sub_pub_id}")
    .replace(/(\{+)?(ua|user_agent)(\}+)?/gi, "{user_agent}")
    .replace(/(\{+)?(ip|user_ip)(\}+)?/gi, "{user_ip}")
    .replace(/=XXXXXXXXXX/gi, "={msisdn}")
    .replace(/=XXXX/gi, "={otp}");

  // Double cleanup to ensure no {{key}} or extra braces remain
  return fixed.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
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

    // Buffer handling
    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;

    let docText = "";
    const ext = file.name.toLowerCase();
    let mimeType = "text/plain"; // Default

    /* =========================
        TEXT PARSING & MIME MAPPING
    ========================= */
    try {
      if (ext.endsWith(".docx")) {
        mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        mimeType = "application/pdf";
        const data = await pdfParse(fileBuffer);
        docText = data.text;
      } else {
        docText = fileBuffer.toString("utf-8", 0, 15000);
      }
    } catch (e) {
      docText = fileBuffer.toString("utf-8", 0, 15000);
    }

    /* =========================
        🔥 GEMINI OCR (STRICT BASE64)
    ========================= */
    let aiConfig = null;

    try {
      // Ensure we send base64 string
      const base64Data = fileBuffer.toString("base64");

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        `Extract technical details from this AdTech API doc. 
        Focus on URLs and params.
        Return ONLY JSON:
        {
          "has_fraud": boolean,
          "fraud": {"af_provider": "string", "af_url": "string"},
          "core_urls": {
            "pin_send_url": "string",
            "verify_pin_url": "string",
            "check_status_url": "string",
            "portal_url": "string"
          },
          "all_params": {}
        }
        Normalization Rules:
        - Identify Send Pin, Verify Pin, Check Status, and Portal/Redirect URLs.
        - Capture all query/body params like cid, sessionKey, etc.`
      ]);

      aiConfig = safeParse(result.response.text());
      console.log("🤖 AI Response Success");

    } catch (err) {
      console.log("⚠️ AI OCR failed, using text-only prompt:", err.message);
      // Fallback: Text-only prompt if OCR/Multimodal fails
      const textResult = await model.generateContent(`Analyze this API text: ${docText.slice(0, 10000)} ... (same JSON rules as above)`);
      aiConfig = safeParse(textResult.response.text());
    }

    /* =========================
        FALLBACK EXTRACTION
    ========================= */
    if (!aiConfig || !aiConfig.core_urls) {
      const foundUrls = docText.match(/https?:\/\/[^\s]+/g) || [];
      aiConfig = {
        has_fraud: false,
        core_urls: {
          pin_send_url: foundUrls.find(u => /send|otp|generate/i.test(u)) || null,
          verify_pin_url: foundUrls.find(u => /verify|validate|confirm/i.test(u)) || null,
          check_status_url: foundUrls.find(u => /status|check/i.test(u)) || null,
          portal_url: foundUrls.find(u => /portal|redirect|success/i.test(u)) || null,
        },
        all_params: {}
      };
    }

    const urls = aiConfig.core_urls || {};

    /* =========================
        🔥 PLACEHOLDER FIX & DB UPDATE
    ========================= */
    const finalUrls = {
      pin_send_url: fixUrl(urls.pin_send_url),
      pin_verify_url: fixUrl(urls.verify_pin_url),
      check_status_url: fixUrl(urls.check_status_url),
      portal_url: fixUrl(urls.portal_url)
    };

    await pool.query(
      `UPDATE offers SET 
        pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4,
        has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
      [finalUrls.pin_send_url, finalUrls.pin_verify_url, finalUrls.check_status_url, finalUrls.portal_url, !!aiConfig.has_fraud, offerId]
    );

    /* =========================
        PARAM SYNC
    ========================= */
    const paramsMap = new Map();
    // Add Core URLs as params for UI mirror
    Object.entries(finalUrls).forEach(([k, v]) => { if (v) paramsMap.set(k, v); });

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => {
        if (v) paramsMap.set(k.toLowerCase(), v);
      });
    }

    // Sync to DB
    for (const [key, val] of paramsMap.entries()) {
      if (val && val !== "null") {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value)
           VALUES ($1, $2, $3)
           ON CONFLICT (offer_id, param_key)
           DO UPDATE SET param_value = EXCLUDED.param_value`,
          [offerId, key, val]
        );
      }
    }

    res.json({ success: true, message: "🔥 SYNC SUCCESSFUL (V14 Stable)", data: aiConfig });

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// Runtime Engine remains same
router.get("/get-runtime-config/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
    const paramsRes = await pool.query("SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1", [offerId]);
    const config = {};
    paramsRes.rows.forEach(p => config[p.param_key] = p.param_value);
    res.json({ success: true, offer: offerRes.rows[0], params: config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
