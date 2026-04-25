import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import axios from "axios";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
// ✅ PDF Fix: Permanent load logic
const pdfParse = require("pdf-parse");

const router = express.Router();

/* ==========================================================
   SAFE JSON PARSER - (Restored from your original logic)
========================================================== */
function safeParse(text) {
    console.log("🔍 Attempting to parse AI response...");
    try {
        if (!text) return null;
        // Cleaning markdown blocks
        let cleanedText = text.replace(/```json|```/g, "").trim();
        const match = cleanedText.match(/\{[\s\S]*\}/);
        if (match) {
            console.log("✅ JSON Structure Found");
            return JSON.parse(match[0]);
        }
        return null;
    } catch (err) {
        console.error("❌ JSON Parse Error:", err.message);
        return null;
    }
}

/* ==========================================================
   🔥 SMART PLACEHOLDER FIX - (Full Detailed Mapping)
========================================================== */
function fixUrl(url) {
    if (!url) return null;
    console.log("🛠️ Fixing Placeholders for URL:", url);

    let fixed = url
        // msisdn variations
        .replace(/(\{)?(msisdn|mobile|phone|number)(\})?/gi, "{msisdn}")
        // otp variations
        .replace(/(\{)?(otp|pin|code)(\})?/gi, "{otp}")
        // transaction variations
        .replace(/(\{)?(transaction_id|transid|txnid|tid|clickid)(\})?/gi, "{transaction_id}")
        // session
        .replace(/(\{)?(sessionkey|session_key|session)(\})?/gi, "{sessionKey}")
        // publisher / partner
        .replace(/(\{)?(pub_id|publisherid|partnerid|userid)(\})?/gi, "{pub_id}")
        // sub publisher
        .replace(/(\{)?(sub_pub_id|subid|sub_id)(\})?/gi, "{sub_pub_id}")
        // user agent & ip
        .replace(/(\{)?(ua|user_agent)(\})?/gi, "{user_agent}")
        .replace(/(\{)?(ip|user_ip)(\})?/gi, "{user_ip}")
        // fix masked values
        .replace(/=XXXXXXXXXX/gi, "={msisdn}")
        .replace(/=XXXX/gi, "={otp}");

    return fixed;
}

/**
 * --- 1. MAIN INTEGRATION ROUTE (Full Detailed Logic) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
    // ✅ CORS Manual Headers
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.sendStatus(200);

    try {
        const { offerId } = req.params;
        console.log(`\n\n*****************************************`);
        console.log(`🚀 STARTING MASTER SYNC - ID: ${offerId}`);
        console.log(`*****************************************`);

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

        if (!file) {
            console.log("❌ No file found in request");
            return res.status(400).json({ error: "No document uploaded" });
        }

        let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
        let docText = "";
        const ext = file.name.toLowerCase();

        /* --- PARSING SECTION --- */
        console.log(`📄 Parsing file: ${file.name}`);
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
        } catch (parseErr) {
            console.warn("⚠️ Buffer Parsing Fallback used");
            docText = fileBuffer.toString("utf-8", 0, 15000);
        }

        console.log("📏 Extracted Text Length:", docText.length);

        /* --- AI EXTRACTION SECTION --- */
        let aiConfig = null;
        try {
            console.log("🤖 Calling Gemini 3 for analysis...");
            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: ext.endsWith(".pdf") ? "application/pdf" : "text/plain",
                        data: fileBuffer.toString("base64")
                    }
                },
                `Expert AdTech Analysis. Extract URLs for SAV/Zain/Gameo offers. 
                 Target: pin_send_url, verify_pin_url, check_status_url, portal_url. 
                 Use exact strings from doc. CONTENT: ${docText.slice(0, 5000)}`
            ]);

            aiConfig = safeParse(result.response.text());
        } catch (aiErr) {
            console.log("❌ AI Call failed:", aiErr.message);
        }

        /* --- STRICT FALLBACK PROTECTION (No Null URLs) --- */
        if (!aiConfig || !aiConfig.core_urls || Object.values(aiConfig.core_urls).every(v => v === null)) {
            console.log("⚠️ TRIGGERING EMERGENCY FALLBACK EXTRACTION...");
            const foundUrls = docText.match(/https?:\/\/[^\s]+/g) || [];
            
            aiConfig = {
                has_fraud: false,
                core_urls: {
                    pin_send_url: foundUrls.find(u => /sendpin|pingen|otp|generate/i.test(u)) || null,
                    verify_pin_url: foundUrls.find(u => /verifypin|validate|confirm/i.test(u)) || null,
                    check_status_url: foundUrls.find(u => /checkstatus|status/i.test(u)) || null,
                    portal_url: foundUrls.find(u => /portal|redirect|success/i.test(u)) || null,
                },
                all_params: {}
            };
        }

        /* --- URL NORMALIZATION --- */
        const urls = aiConfig.core_urls || {};
        const finalUrls = {
            pin_send_url: fixUrl(urls.pin_send_url),
            pin_verify_url: fixUrl(urls.verify_pin_url),
            check_status_url: fixUrl(urls.check_status_url),
            portal_url: fixUrl(urls.portal_url)
        };

        /* --- DATABASE CORE SYNC --- */
        console.log("💾 Updating Offers table...");
        await pool.query(
            `UPDATE offers SET 
                pin_send_url=$1, pin_verify_url=$2, check_status_url=$3, portal_url=$4,
                has_antifraud=$5, updated_at=NOW() WHERE id=$6`,
            [finalUrls.pin_send_url, finalUrls.pin_verify_url, finalUrls.check_status_url, finalUrls.portal_url, !!aiConfig.has_fraud, offerId]
        );

        /* --- PARAMETERS MIRROR SYNC (UI DISPLAY) --- */
        console.log("💾 Updating Parameters table...");
        const paramsMap = new Map();
        
        // Ensure URLs show up in the UI fields
        if (finalUrls.pin_send_url) paramsMap.set("pin_send_url", finalUrls.pin_send_url);
        if (finalUrls.pin_verify_url) paramsMap.set("verify_pin_url", finalUrls.pin_verify_url);
        if (finalUrls.check_status_url) paramsMap.set("check_status_url", finalUrls.check_status_url);
        if (finalUrls.portal_url) paramsMap.set("portal_url", finalUrls.portal_url);

        if (aiConfig.all_params) {
            Object.entries(aiConfig.all_params).forEach(([k, v]) => {
                // ✅ Fix: Null Value Constraint safety
                if (v !== null && v !== undefined && v !== "") {
                    paramsMap.set(k.toLowerCase(), v);
                }
            });
        }

        // Loop to sync all params one by one
        for (const [key, val] of paramsMap.entries()) {
            await pool.query(
                `INSERT INTO offer_parameters (offer_id, param_key, param_value) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
                [offerId, key, val]
            );
        }

        console.log("✅ SYNC COMPLETED SUCCESSFULLY");
        res.json({
            success: true,
            message: "🔥 MASTER SUCCESS (V16 Final Restored)",
            data: aiConfig
        });

    } catch (err) {
        console.error("❌ CRITICAL ERROR:", err.message);
        res.status(500).json({ error: "Integration Failed", details: err.message });
    }
});

/**
 * --- 2. RUNTIME ENGINE (Dashboard Configuration Loader) ---
 */
router.get("/get-runtime-config/:offerId", async (req, res) => {
    try {
        const { offerId } = req.params;
        const offerRes = await pool.query("SELECT * FROM offers WHERE id = $1", [offerId]);
        const paramsRes = await pool.query("SELECT param_key, param_value FROM offer_parameters WHERE offer_id = $1", [offerId]);
        
        const config = {};
        paramsRes.rows.forEach(p => {
            config[p.param_key] = p.param_value;
        });

        res.json({
            success: true,
            offer: offerRes.rows[0],
            params: config,
            runtime: { transaction_id: `m13r_${Date.now()}` }
        });
    } catch (err) {
        console.error("❌ Runtime Loader Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;
