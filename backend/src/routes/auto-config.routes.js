import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth"; 
import pdf from "pdf-parse";

const router = express.Router();

// 🔥 IMPORTANT: Apni Gemini API Key yahan ya .env mein rakhein
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY");

router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    if (!req.files || !req.files.doc) return res.status(400).json({ error: "No document uploaded" });
    
    const file = req.files.doc;
    let docText = "";

    // 1. Text Extraction
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer: file.data });
      docText = result.value;
    } else if (file.mimetype === "application/pdf") {
      const data = await pdf(file.data);
      docText = data.text;
    } else {
      return res.status(400).json({ error: "Unsupported file type. Use PDF or DOCX." });
    }

    // 2. Gemini AI Analysis (Improved Prompt for Shemaroo)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { response_mime_type: "application/json" } // 🔥 Enforces JSON output
    });

    const prompt = `
      Analyze this VAS API documentation. 
      Return ONLY a JSON object. 
      Important: Look for Shemaroo specific headers like 'Authorization' with 'Basic' prefix.
      Placeholders to use: {msisdn}, {transaction_id}, {otp}, {ip}.

      Schema:
      {
        "pin_send_url": "URL for OTP",
        "pin_verify_url": "URL for verify",
        "check_status_url": "URL for check status",
        "portal_url": "URL for product/redirection",
        "has_antifraud": boolean,
        "has_status_check": boolean,
        "params": [ { "key": "string", "value": "string" } ]
      }
      Doc Text: ${docText}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Safety check for JSON parsing
    let aiConfig;
    try {
        aiConfig = JSON.parse(responseText);
    } catch (e) {
        console.error("AI Response was not valid JSON:", responseText);
        return res.status(500).json({ error: "AI failed to generate valid config" });
    }

    // 3. Database Update (Offer Table)
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, has_status_check = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        aiConfig.pin_send_url || null, 
        aiConfig.pin_verify_url || null, 
        aiConfig.check_status_url || null, 
        aiConfig.portal_url || null, 
        !!aiConfig.has_antifraud, 
        !!aiConfig.has_status_check, 
        offerId
      ]
    );

    // 4. Parameters Table Update (Mapping Shemaroo keys like service_id, partner_id)
    if (aiConfig.params && Array.isArray(aiConfig.params)) {
      for (const p of aiConfig.params) {
        await pool.query(
          `INSERT INTO offer_parameters (offer_id, param_key, param_value) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (offer_id, param_key) 
           DO UPDATE SET param_value = EXCLUDED.param_value`, // 🔥 Updates if key already exists
          [offerId, p.key, p.value]
        );
      }
    }

    res.json({ success: true, message: "AI Integration Complete", data: aiConfig });
  } catch (err) {
    console.error("AUTO-CONFIG ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
