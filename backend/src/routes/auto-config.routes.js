import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import fs from "fs/promises";
import axios from "axios";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
// ✅ Fix: ESM module support for pdf-parse
const pdfParse = require("pdf-parse");

const router = express.Router();

/**
 * --- 1. THE UNIVERSAL SCANNER (V12 - Master Integration) ---
 */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    console.log(`🚀 Mob13r-Robo V12: Master Dashboard Sync for ID: ${offerId}`);

    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    let model;
    try {
      model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    } catch (e) {
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    const fileKeys = Object.keys(req.files || {});
    const file = fileKeys.length ? req.files[fileKeys[0]] : null;
    if (!file) return res.status(400).json({ error: "No document uploaded" });

    let fileBuffer = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    let docText = "";
    const ext = file.name.toLowerCase();
    
    // UNIVERSAL PARSING (DOCX, PDF, TXT, etc.)
    try {
      if (ext.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        docText = result.value;
      } else if (ext.endsWith(".pdf")) {
        const data = await pdfParse(fileBuffer);
        docText = data.text;
      } else {
        docText = fileBuffer.toString('utf-8', 0, 15000);
      }
    } catch (parseErr) {
      docText = fileBuffer.toString('utf-8', 0, 15000);
    }

    const prompt = `
      Expert AdTech Parser: Extract technical details.
      Special Instructions:
      - Match #MSISDN#, {msisdn}, #ANDROIDID# to: msisdn, transaction_id.
      - Extract specific campaign keys: cmpid, pubid, refUrl, partner_id URI.
      - Recognize patterns like "pingen.php" or "send-otp" as pin_send_url.
      - Recognize "pinval.php" or "verify-otp" as verify_pin_url.

      Dashboard UI Sync Requirement:
      Use EXACT keys: "pin_send_url", "verify_pin_url", "check_status_url", "portal_url".

      Return ONLY JSON:
      {
        "has_fraud": boolean,
        "fraud": { "af_provider": "evina|alacrity|mcp|custom", "af_url": "string" },
        "core_urls": {
          "pin_send_url": "string",
          "verify_pin_url": "string",
          "check_status_url": "string",
          "portal_url": "string"
        },
        "all_params": {
           "method_send": "GET|POST",
           "dtype_send": "query|body",
           "method_verify": "GET|POST",
           "service_id": "string",
           "cmpid": "string",
           "partner_id": "string"
        }
      }
      CONTENT: ${docText.slice(0, 19500)}`;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (err) {
      const fallback = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      result = await fallback.generateContent(prompt);
    }

    const aiConfig = JSON.parse((await result.response).text().replace(/```json|```/g, "").trim());

    // --- 🛠️ 1. FORCE UPDATE Core Offer Table ---
    const urls = aiConfig.core_urls || {};
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, updated_at = NOW() WHERE id = $6`,
      [
        urls.pin_send_url || null, 
        urls.verify_pin_url || null, 
        urls.check_status_url || null, 
        urls.portal_url || null, 
        !!aiConfig.has_fraud, 
        offerId
      ]
    );

    // --- 🛠️ 2. MIRROR SYNC for Dashboard Display ---
    const paramsMap = new Map();
    
    if (urls.pin_send_url) paramsMap.set("pin_send_url", urls.pin_send_url);
    if (urls.verify_pin_url) paramsMap.set("verify_pin_url", urls.verify_pin_url);
    if (urls.check_status_url) paramsMap.set("check_status_url", urls.check_status_url);
    if (urls.portal_url) paramsMap.set("portal_url", urls.portal_url);

    if (aiConfig.all_params) {
      Object.entries(aiConfig.all_params).forEach(([k, v]) => paramsMap.set(k.toLowerCase(), v));
    }
    if (aiConfig.fraud) {
      Object.entries(aiConfig.fraud).forEach(([k, v]) => paramsMap.set(k.toLowerCase(), v));
    }

    // Final Batch Update for UI inputs
    for (const [key, val] of paramsMap.entries()) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value) VALUES ($1, $2, $3)
         ON CONFLICT (offer_id, param_key) DO UPDATE SET param_value = EXCLUDED.param_value`,
        [offerId, key, val]
      );
    }

    res.json({ success: true, message: "Master Robo: Dashboard Display Synced!", data: aiConfig });
  } catch (err) {
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
