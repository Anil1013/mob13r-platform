import express from "express";
import pool from "../db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth"; // DOCX ke liye
import pdf from "pdf-parse"; // PDF ke liye

const router = express.Router();
const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;
    const file = req.files.doc;
    let docText = "";

    // 1. Document se text extract karna
    if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer: file.data });
      docText = result.value;
    } else if (file.mimetype === "application/pdf") {
      const data = await pdf(file.data);
      docText = data.text;
    }

    // 2. Gemini AI Analysis
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Analyze this API documentation and extract technical details for a VAS service integration.
      Return ONLY a JSON object with these keys:
      {
        "pin_send_url": "URL for sending OTP",
        "pin_verify_url": "URL for verifying OTP",
        "check_status_url": "URL for checking user status",
        "portal_url": "Product/Redirection URL",
        "has_antifraud": boolean (true if Evina/JS/Script mentioned),
        "has_status_check": boolean (true if check-status exists),
        "params": [ { "key": "param_name", "value": "default_or_placeholder" } ],
        "headers": { "Authorization": "value if found" }
      }
      Doc Text: ${docText}
    `;

    const result = await model.generateContent(prompt);
    const aiConfig = JSON.parse(result.response.text());

    // 3. Database Update (Offer Table)
    await pool.query(
      `UPDATE offers SET 
        pin_send_url = $1, pin_verify_url = $2, check_status_url = $3, portal_url = $4,
        has_antifraud = $5, has_status_check = $6
       WHERE id = $7`,
      [aiConfig.pin_send_url, aiConfig.pin_verify_url, aiConfig.check_status_url, aiConfig.portal_url, aiConfig.has_antifraud, aiConfig.has_status_check, offerId]
    );

    // 4. Parameters Table Update
    for (const p of aiConfig.params) {
      await pool.query(
        `INSERT INTO offer_parameters (offer_id, param_key, param_value) 
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [offerId, p.key, p.value]
      );
    }

    res.json({ success: true, message: "AI Integration Complete", data: aiConfig });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
