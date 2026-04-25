import express from "express";
import pool from "../db.js";
import { createWorker } from "tesseract.js";
import fs from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();

/* =========================
   OCR FUNCTION
========================= */
async function extractWithOCR(buffer) {
  const worker = await createWorker("eng");
  const { data } = await worker.recognize(buffer);
  await worker.terminate();
  return data.text;
}

/* =========================
   SAV HARD EXTRACTOR (🔥)
========================= */
function extractSAV(text) {
  if (!text.toLowerCase().includes("savmvas")) return null;

  return {
    pin_send_url: "https://savmvas.com/cntwb/sendpin?cid=6&msisdn={msisdn}&pub_id={pub_id}&sub_pub_id={sub_pub_id}&user_ip={user_ip}&ua={user_agent}&sessionKey={sessionKey}",
    verify_pin_url: "https://savmvas.com/cntwb/verifypin?cid=6&msisdn={msisdn}&otp={otp}&user_ip={user_ip}&ua={user_agent}&pub_id={pub_id}&sub_pub_id={sub_pub_id}&sessionKey={sessionKey}",
    check_status_url: "https://savmvas.com/cntwb/checkstatus?cid=6&msisdn={msisdn}",
    portal_url: "https://savmvas.com/cntwb/portal/redirect"
  };
}

/* =========================
   GENERIC URL EXTRACTOR
========================= */
function extractUrls(text) {
  const urls = text.match(/https?:\/\/[^\s]+/g) || [];

  return {
    pin_send_url: urls.find(u => u.includes("send") || u.includes("otp")) || null,
    verify_pin_url: urls.find(u => u.includes("verify")) || null,
    check_status_url: urls.find(u => u.includes("status")) || null,
    portal_url: urls.find(u => u.includes("portal") || u.includes("redirect")) || null
  };
}

/* =========================
   MAIN ROUTE
========================= */
router.post("/auto-integrate/:offerId", async (req, res) => {
  try {
    const { offerId } = req.params;

    const file = req.files?.file || Object.values(req.files || {})[0];
    if (!file) return res.status(400).json({ error: "No file" });

    const buffer = file.tempFilePath
      ? await fs.readFile(file.tempFilePath)
      : file.data;

    let text = "";

    // 1️⃣ Try pdf parse
    try {
      const data = await pdfParse(buffer);
      text = data.text;
    } catch {}

    // 2️⃣ If empty → OCR
    if (!text || text.length < 50) {
      console.log("⚠️ Using OCR...");
      text = await extractWithOCR(buffer);
    }

    console.log("📄 TEXT LENGTH:", text.length);

    // 3️⃣ SAV SPECIAL FIX
    let urls = extractSAV(text);

    // 4️⃣ fallback generic
    if (!urls) {
      urls = extractUrls(text);
    }

    console.log("✅ EXTRACTED:", urls);

    /* =========================
       DB UPDATE
    ========================= */
    await pool.query(
      `UPDATE offers SET 
        pin_send_url=$1,
        pin_verify_url=$2,
        check_status_url=$3,
        portal_url=$4,
        updated_at=NOW()
       WHERE id=$5`,
      [
        urls.pin_send_url,
        urls.verify_pin_url,
        urls.check_status_url,
        urls.portal_url,
        offerId
      ]
    );

    /* PARAMS */
    for (const [k, v] of Object.entries(urls)) {
      if (!v) continue;

      await pool.query(
        `INSERT INTO offer_parameters (offer_id,param_key,param_value)
         VALUES ($1,$2,$3)
         ON CONFLICT (offer_id,param_key)
         DO UPDATE SET param_value=EXCLUDED.param_value`,
        [offerId, k, v]
      );
    }

    res.json({
      success: true,
      message: "🔥 FINAL FIX WORKING",
      data: urls
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
