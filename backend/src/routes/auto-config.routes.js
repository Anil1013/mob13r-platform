import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth"; 
import pdf from "pdf-parse";

const router = express.Router();

// 🔥 IMPORTANT: Make sure this Key is valid in your .env
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

    // 2. Text Extraction
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer: file.data });
      docText = result.value;
    } else if (file.mimetype === "application/pdf") {
      const data = await pdf(file.data);
      docText = data.text;
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please use PDF or DOCX." });
    }

    // 3. Gemini AI Analysis (Optimized for Shemaroo/VAS)
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { response_mime_type: "application/json" } 
    });

    const prompt = `
      Analyze this VAS API documentation. Extract technical details and return ONLY a JSON object.
      
      Mapping Instructions:
      1. URLs: Look for 'check-status', 'send-otp', 'verify-otp', and 'product-url'.
      2. Logic Flags: 
         - Set 'has_status_check' to true if a status check API exists (e.g., Shemaroo).
         - Set 'has_portal_step' to true if there is a redirection/product URL after verification.
         - Set 'has_antifraud' to true if "Evina", "JS response", or scripts are mentioned.
      3. Parameters: Extract all keys from request bodies. Use these placeholders for values: 
         {msisdn}, {transaction_id}, {otp}, {ip}, {user_agent}.
      4. Authorization: Find the full 'Authorization' header value (e.g., "Basic czJzLWNvbGxlY3RjZW50OlNoZW1AcjAw").
      5. Button: Capture 'confirmButtonId' if specified.

      Schema:
      {
        "pin_send_url": "string",
        "pin_verify_url": "string",
        "check_status_url": "string",
        "portal_url": "string",
        "has_antifraud": boolean,
        "has_status_check": boolean,
        "has_portal_step": boolean,
        "params": [ { "key": "string", "value": "string" } ]
      }
      Doc Text: ${docText}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let aiConfig;
    try {
        aiConfig = JSON.parse(responseText);
    } catch (e) {
        console.error("AI Response Error:", responseText);
        return res.status(500).json({ error: "AI failed to generate a valid configuration. Please try again." });
    }

    // 4. Database Update (Offers Table)
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

    // 5. Database Update (Offer Parameters Table)
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

    res.json({ success: true, message: "AI Integration Completed Successfully", data: aiConfig });

  } catch (err) {
    console.error("AUTO-INTEGRATE CRITICAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
