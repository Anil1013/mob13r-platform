import express from "express";
import pool from "../db.js";
import fs from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router = express.Router();

/* =========================
   SMART URL MATCHER
========================= */
function findUrl(urls, keywords) {
  return urls.find(u =>
    keywords.some(k => u.toLowerCase().includes(k))
  ) || null;
}

/* =========================
   UNIVERSAL EXTRACTOR
========================= */
function extractUrls(text) {
  const urls = text.match(/https?:\/\/[^\s]+/g) || [];

  return {
    pin_send_url: findUrl(urls, ["send", "otp", "generate", "request"]),
    pin_verify_url: findUrl(urls, ["verify", "validate", "confirm", "checkotp"]),
    check_status_url: findUrl(urls, ["status", "check", "lookup"]),
    portal_url: findUrl(urls, ["success", "redirect", "portal"]),
  };
}

/* =========================
   PLACEHOLDER NORMALIZER
========================= */
function fixPlaceholders(url) {
  if (!url) return null;

  return url
    .replace(/\{?msisdn\}?/gi, "{msisdn}")
    .replace(/\{?otp\}?/gi, "{otp}")
    .replace(/\{?transaction_id\}?/gi, "{transaction_id}")
    .replace(/\{?sessionkey\}?/gi, "{sessionKey}")
    .replace(/\{?userid\}?/gi, "{pub_id}");
}

/* =========================
   ROUTE
========================= */
router.post("/auto-integrate/:offerId", async (req, res) => {
  const { offerId } = req.params;

  try {
    const file = req.files?.file || Object.values(req.files || {})[0];
    if (!file) return res.status(400).json({ error: "No file" });

    const filePath = file.tempFilePath;

    // instant response
    res.json({
      success: true,
      message: "Processing started"
    });

    processFile(filePath, offerId);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* =========================
   BACKGROUND PROCESS
========================= */
async function processFile(filePath, offerId) {
  try {
    const buffer = await fs.readFile(filePath);

    let text = "";

    try {
      const data = await pdfParse(buffer);
      text = data.text || "";
    } catch {
      console.log("PDF parse failed");
    }

    console.log("TEXT LENGTH:", text.length);

    let urls = extractUrls(text);

    /* =========================
       FALLBACK (NO TEXT)
    ========================= */
    if (!text || text.length < 50) {
      console.log("⚠️ weak text → fallback");

      urls = {
        pin_send_url: null,
        pin_verify_url: null,
        check_status_url: null,
        portal_url: null
      };
    }

    /* =========================
       NORMALIZE
    ========================= */
    Object.keys(urls).forEach(k => {
      urls[k] = fixPlaceholders(urls[k]);
    });

    console.log("FINAL:", urls);

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
        urls.pin_verify_url,
        urls.check_status_url,
        urls.portal_url,
        offerId
      ]
    );

    console.log("✅ DONE:", offerId);

  } catch (err) {
    console.error("ERROR:", err);
  }
}

export default router;
