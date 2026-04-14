import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth"; 

// 🔥 Fix for pdf-parse (SyntaxError: does not provide export named 'default')
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const router = express.Router();

// Gemini API Key (Make sure it's in your .env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    // 1. Validation & File Handling
    if (!req.files || !req.files.doc) {
      return res.status(400).json({ error: "No document uploaded" });
    }
    
    const file = req.files.doc;
    let docText = "";

    // 2. Text Extraction Logic
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer: file.data });
      docText = result.value;
    } else if (file.mimetype === "application/pdf") {
      const data = await pdf(file.data);
      docText = data.text;
    } else {
      // DOCX handle karne ke liye fallback check agar mammoth fail ho
      const result = await mammoth.extractRawText({ buffer: file.data });
      docText = result.value;
    }

    // 3. Gemini AI Analysis (Improved for Shemaroo)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { response_mime_type: "application/json" } 
    });

    const prompt = `
      Analyze this VAS API documentation for Shemaroo/Collectcent. Extract details and return ONLY a JSON object.
      
      Instructions:
      1. URLs: Look for 'check-status', 'send-otp', 'verify-otp', and 'product-url'.
      2. Logic Flags: 
         - has_status_check: true if check-status exists.
         - has_portal_step: true if product-url is required after verify.
         - has_antifraud: true if Evina/JS/Script mentioned.
      3. Parameters: Map service_id, partner_id, transaction_id, etc.
      4. Auth: Find full 'Authorization' value (e.g. Basic czJz...).
      5. Values: Use {msisdn}, {transaction_id}, {otp} for dynamic fields.

      Doc Text: ${docText}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let aiConfig;
    try {
        aiConfig = JSON.parse(responseText);
    } catch (e) {
        console.error("AI Response Error:", responseText);
        return res.status(500).json({ error: "AI failed to parse document correctly." });
    }

    // 4. Update Offers Table
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, has_status_check = $6, has_portal_step = $7, 
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        aiConfig.pin_send_url || null, 
        aiConfig.pin_verify_url || null, 
        aiConfig.check_status_url || null, 
        aiConfig.portal_url || null, 
        !!aiConfig.has_antifraud, 
        !!aiConfig.has_status_check, 
        !!aiConfig.has_portal_step,
        offerId
      ]
    );

    // 5. Update Offer Parameters (Conflict check handled)
    if (aiConfig.params && Array.isArray(aiConfig.params)) {
      for (const p of aiConfig.params) {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (offer_id, param_key) 
           DO UPDATE SET param_value = EXCLUDED.param_value`, 
          [offerId, p.key, p.value]
        );
      }
    }

    res.json({ success: true, message: "AI Integration Successful", data: aiConfig });

  } catch (err) {
    console.error("AUTO-CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
