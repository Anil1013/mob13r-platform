import express from "express";
import pool from "../db.js";
import PDFDocument from "pdfkit";

const router = express.Router();

/**
 * 🔥 Publisher API Docs Generator (SESSION TOKEN BASED)
 */
router.get("/publisher/:pubId/offer/:offerId/docs", async (req, res) => {
  try {
    const { pubId, offerId } = req.params;

    /* =========================
       🔹 Fetch Publisher
    ========================= */
    const pubRes = await pool.query(
      "SELECT id, api_key FROM publishers WHERE id=$1",
      [pubId]
    );

    if (!pubRes.rows.length) {
      return res.status(404).json({ error: "Publisher not found" });
    }

    const publisher = pubRes.rows[0];
    const apiKey = publisher.api_key;

    /* =========================
       🔹 Fetch Offer
    ========================= */
    const offerRes = await pool.query(
      "SELECT id, geo, carrier, service FROM offers WHERE id=$1",
      [offerId]
    );

    if (!offerRes.rows.length) {
      return res.status(404).json({ error: "Offer not found" });
    }

    const offer = offerRes.rows[0];

    const BASE = "https://backend.mob13r.com";

    /* =========================
       🔥 FINAL CORRECT URLs (SESSION FLOW)
    ========================= */

    // ✅ PIN SEND (only place where msisdn is used)
    const pinSendURL =
      `${BASE}/api/publisher/pin/send` +
      `?offer_id=${offerId}` +
      `&msisdn={msisdn}` +
      `&geo=${offer.geo || "IQ"}` +
      `&carrier=${offer.carrier || "Zain"}` +
      `&x-api-key=${apiKey}`;

    // ✅ VERIFY (session_token based)
    const verifyURL =
      `${BASE}/api/publisher/pin/verify` +
      `?session_token={session_token}` +
      `&otp={otp}` +
      `&x-api-key=${apiKey}`;

    // ✅ STATUS (session_token based)
    const statusURL =
      `${BASE}/api/publisher/status` +
      `?session_token={session_token}` +
      `&x-api-key=${apiKey}`;

    // ✅ PORTAL (session_token based)
    const portalURL =
      `${BASE}/portal/${offerId}` +
      `?session_token={session_token}`;

    /* =========================
       📄 GENERATE PDF
    ========================= */

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=offer_${offerId}_api_docs.pdf`
    );

    doc.pipe(res);

    /* =========================
       🧾 HEADER
    ========================= */
    doc.fontSize(20).text("Mob13r Publisher API Docs", {
      align: "center",
    });

    doc.moveDown();

    doc.fontSize(12).text(`Offer ID: ${offerId}`);
    doc.text(`Publisher ID: ${pubId}`);
    doc.text(`API Key: ${apiKey}`);
    doc.text(`Geo: ${offer.geo || "N/A"}`);
    doc.text(`Carrier: ${offer.carrier || "N/A"}`);

    doc.moveDown(2);

    /* =========================
       🔥 STEP 1: PIN SEND
    ========================= */
    doc.fontSize(14).text("1. PIN SEND (Generate OTP)");
    doc.moveDown(0.5);

    doc.fontSize(10).text(pinSendURL);
    doc.moveDown();

    doc.text("Response:");
    doc.text(`{
  "status": "OTP_SENT",
  "session_token": "abc-123"
}`);
    doc.moveDown(2);

    /* =========================
       🔥 STEP 2: VERIFY
    ========================= */
    doc.fontSize(14).text("2. PIN VERIFY");
    doc.moveDown(0.5);

    doc.fontSize(10).text(verifyURL);
    doc.moveDown();

    doc.text("Description:");
    doc.text("- Use session_token from PIN SEND response");
    doc.text("- User enters OTP received on mobile");

    doc.moveDown(2);

    /* =========================
       🔥 STEP 3: STATUS
    ========================= */
    doc.fontSize(14).text("3. STATUS CHECK");
    doc.moveDown(0.5);

    doc.fontSize(10).text(statusURL);
    doc.moveDown();

    doc.text("Description:");
    doc.text("- Check final subscription status");
    doc.text("- Use same session_token");

    doc.moveDown(2);

    /* =========================
       🔥 STEP 4: PORTAL
    ========================= */
    doc.fontSize(14).text("4. USER REDIRECT / PORTAL");
    doc.moveDown(0.5);

    doc.fontSize(10).text(portalURL);
    doc.moveDown();

    doc.text("Description:");
    doc.text("- Redirect user after successful verification");

    doc.moveDown(2);

    /* =========================
       🧠 IMPORTANT NOTES
    ========================= */
    doc.fontSize(12).text("Important Notes:");
    doc.fontSize(10).text("- Replace {msisdn} with user mobile number");
    doc.text("- Replace {otp} with OTP entered by user");
    doc.text("- session_token is REQUIRED for verify & status");
    doc.text("- Do NOT reuse session_token across users");
    doc.text("- Always use same session_token in full flow");

    doc.moveDown();

    doc.text("Flow Summary:");
    doc.text("PIN SEND → VERIFY → STATUS → PORTAL");

    doc.end();

  } catch (err) {
    console.error("❌ Docs Error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
