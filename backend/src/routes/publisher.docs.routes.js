import express from "express";
import pool from "../db.js";
import PDFDocument from "pdfkit";

const router = express.Router();

/**
 * 🔥 Publisher API Docs Generator (Generic & Session Flow)
 * Version: V23 - Fully Updated (No lines broken)
 */
router.get("/publisher/:pubId/offer/:offerId/docs", async (req, res) => {
  try {
    const { pubId, offerId } = req.params;
    const { format } = req.query; // Supports ?format=pdf for direct download

    /* ==========================================================
       🔹 1. Fetch Publisher Details
    ========================================================== */
    const pubRes = await pool.query(
      "SELECT id, api_key FROM publishers WHERE id=$1",
      [pubId]
    );

    if (!pubRes.rows.length) {
      console.error("❌ Docs Error: Publisher not found");
      return res.status(404).json({ error: "Publisher not found" });
    }

    const publisher = pubRes.rows[0];
    const apiKey = publisher.api_key;

    /* ==========================================================
       🔹 2. Fetch Offer Details (Dynamic Geo & Carrier)
    ========================================================== */
    const offerRes = await pool.query(
      "SELECT id, geo, carrier, service_name FROM offers WHERE id=$1",
      [offerId]
    );

    if (!offerRes.rows.length) {
      console.error("❌ Docs Error: Offer not found");
      return res.status(404).json({ error: "Offer not found" });
    }

    const offer = offerRes.rows[0];
    const BASE = "https://backend.mob13r.com";

    /* ==========================================================
       🔥 UNIVERSAL DYNAMIC URLs (Generic Geo/Carrier)
    ========================================================== */

    // ✅ STEP 1: PIN SEND (msisdn required)
    const pinSendURL =
      `${BASE}/api/publisher/pin/send` +
      `?offer_id=${offerId}` +
      `&msisdn={msisdn}` +
      `&geo=${offer.geo || "N/A"}` +
      `&carrier=${offer.carrier || "N/A"}` +
      `&x-api-key=${apiKey}`;

    // ✅ STEP 2: PIN VERIFY (session_token based)
    const verifyURL =
      `${BASE}/api/publisher/pin/verify` +
      `?session_token={session_token}` +
      `&otp={otp}` +
      `&x-api-key=${apiKey}`;

    // ✅ STEP 3: STATUS CHECK (session_token based)
    const statusURL =
      `${BASE}/api/publisher/status` +
      `?session_token={session_token}` +
      `&x-api-key=${apiKey}`;

    // ✅ STEP 4: PORTAL REDIRECT (Success Flow)
    const portalURL =
      `${BASE}/portal/${offerId}` +
      `?session_token={session_token}`;

    /* ==========================================================
       📄 GENERATE PDF VERSION (If ?format=pdf)
    ========================================================== */
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 40 });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=offer_${offerId}_api_docs.pdf`
      );

      doc.pipe(res);

      // Header
      doc.fontSize(22).text("Mob13r Publisher API Docs", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Service: ${offer.service_name || "N/A"}`);
      doc.text(`Offer ID: ${offerId} | Publisher ID: ${pubId}`);
      doc.text(`Geo: ${offer.geo || "N/A"} | Carrier: ${offer.carrier || "N/A"}`);
      doc.text(`API Key: ${apiKey}`);
      doc.moveDown(2);

      // PIN SEND
      doc.fontSize(14).fillColor("blue").text("1. PIN SEND (Generate OTP)");
      doc.fontSize(10).fillColor("black").text(pinSendURL);
      doc.moveDown();

      // VERIFY
      doc.fontSize(14).fillColor("blue").text("2. PIN VERIFY (Session Based)");
      doc.fontSize(10).fillColor("black").text(verifyURL);
      doc.moveDown();

      // STATUS
      doc.fontSize(14).fillColor("blue").text("3. STATUS CHECK");
      doc.fontSize(10).fillColor("black").text(statusURL);
      doc.moveDown();

      // PORTAL
      doc.fontSize(14).fillColor("blue").text("4. SUCCESS REDIRECT (Portal)");
      doc.fontSize(10).fillColor("black").text(portalURL);
      doc.moveDown(2);

      // Notes
      doc.fontSize(12).text("Integration Notes:");
      doc.fontSize(10).text("- Use 'session_token' from Step 1 response for all subsequent calls.");
      doc.text("- Do NOT reuse tokens across different users.");
      doc.text("- Redirect user to Portal URL only after Status is 'active'.");

      doc.end();
      return;
    }

    /* ==========================================================
       🖥️ GENERATE HTML PREVIEW (Default View)
    ========================================================== */
    const html = `
      <html>
        <head>
          <title>API Docs: ${offer.service_name}</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; }
            .container { max-width: 900px; margin: auto; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
            .endpoint { background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 5px solid #2563eb; margin-bottom: 20px; }
            code { background: #111827; color: #10b981; padding: 10px; display: block; border-radius: 5px; margin-top: 10px; overflow-x: auto; font-size: 0.9em; }
            .btn { background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>API Documentation: ${offer.service_name}</h1>
              <p><strong>Geo:</strong> ${offer.geo} | <strong>Carrier:</strong> ${offer.carrier}</p>
              <a href="?format=pdf" class="btn">📥 Download PDF Version</a>
            </div>

            <div class="endpoint">
              <h3>1. PIN SEND (Generate OTP)</h3>
              <p>Initialize the subscription flow with user's mobile number.</p>
              <code>${pinSendURL}</code>
            </div>

            <div class="endpoint">
              <h3>2. PIN VERIFY (Confirm OTP)</h3>
              <p>Verify the 5-digit PIN received by the user.</p>
              <code>${verifyURL}</code>
            </div>

            <div class="endpoint">
              <h3>3. STATUS CHECK</h3>
              <p>Check the final subscription status using session_token.</p>
              <code>${statusURL}</code>
            </div>

            <div class="endpoint">
              <h3>4. PORTAL / SUCCESS REDIRECT</h3>
              <p>Redirect user to this URL after successful verify.</p>
              <code>${portalURL}</code>
            </div>

            <div style="margin-top: 50px; padding: 20px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;">
              <strong>Important Notes:</strong>
              <ul>
                <li>Replace {msisdn} with the user's actual mobile number.</li>
                <li>Capture <b>session_token</b> from PIN SEND response to use in Step 2, 3, and 4.</li>
                <li>Follow the order: Send -> Verify -> Status -> Portal.</li>
              </ul>
            </div>
          </div>
        </body>
      </html>
    `;

    res.send(html);

  } catch (err) {
    console.error("❌ CRITICAL ERROR in Docs Route:", err.message);
    res.status(500).json({ error: "Failed to generate documentation", details: err.message });
  }
});

export default router;
