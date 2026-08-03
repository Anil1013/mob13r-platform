import express from "express";
import PDFDocument from "pdfkit";
import pool from "../db.js";

const router = express.Router();
const BASE = "https://backend.mob13r.com";

// Color constants (module level - accessible everywhere)
const RED   = "#e94560";
const DARK  = "#1a1a2e";
const GRAY  = "#64748b";
const WHITE = "#ffffff";
const BG    = "#0a0f1e";
const GREEN = "#22c55e";

async function getDocsData(pubId, offerId) {
  const pubRes = await pool.query(
    "SELECT id, api_key, name FROM publishers WHERE id=$1",
    [pubId]
  );
  if (!pubRes.rows.length) throw new Error("Publisher not found");
  const publisher = pubRes.rows[0];

  const offerRes = await pool.query(
    `SELECT o.id, o.geo, o.carrier, o.service_name, o.otp_length,
            o.pin_send_url, o.pin_verify_url, o.check_status_url, o.portal_url,
            COALESCE(po.pub_offer_name, o.service_name) AS display_name
     FROM offers o
     LEFT JOIN publisher_offers po ON po.offer_id = o.id AND po.publisher_id = $2
     WHERE o.id = $1 LIMIT 1`,
    [offerId, pubId]
  );
  if (!offerRes.rows.length) throw new Error("Offer not found");
  const offer = offerRes.rows[0];

  // Active parameters
  const paramsRes = await pool.query(
    `SELECT param_key, param_value FROM offer_parameters
     WHERE offer_id=$1 AND is_active=true ORDER BY id`,
    [offerId]
  );

  const pinSendURL   = `${BASE}/api/publisher/pin/send?offer_id=${offerId}&msisdn={msisdn}&geo=${offer.geo}&carrier=${offer.carrier}&x-api-key=${publisher.api_key}`;
  const verifyURL    = `${BASE}/api/publisher/pin/verify?session_token={session_token}&otp={otp}&x-api-key=${publisher.api_key}`;
  const statusURL    = offer.has_status_check && offer.check_status_url
    ? `${BASE}/api/publisher/status/check?session_token={session_token}&x-api-key=${publisher.api_key}` : null;
  const portalURL    = offer.has_portal_step && offer.portal_url ? offer.portal_url : null;
  const antifraudURL = offer.has_antifraud && offer.af_prepare_url
    ? `${BASE}/api/publisher/antifraud/prepare?session_token={session_token}&x-api-key=${publisher.api_key}` : null;

  return { publisher, offer, pinSendURL, verifyURL, statusURL, portalURL, antifraudURL, params: paramsRes.rows };
}

function generatePDF({ publisher, offer, pinSendURL, verifyURL, statusURL, portalURL, antifraudURL, params }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks = [];
      doc.on("data", c => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const ML = 50;
      const CW = 495;

      // ── HEADER ──────────────────────────────────────────────
      doc.rect(0, 0, 595, 80).fill(DARK);
      doc.fontSize(22).fillColor(RED).text("mob13r", ML, 22);
      doc.fontSize(22).fillColor(WHITE).text("  —  API Documentation", ML, 22);
      doc.fontSize(10).fillColor("#94a3b8").text("Publisher Integration Guide", ML, 52);
      doc.y = 100;

      // ── OFFER INFO ───────────────────────────────────────────
      doc.fontSize(13).fillColor(DARK).text("Service: " + offer.display_name, ML);
      doc.fontSize(11).fillColor(GRAY).text("Geo: " + offer.geo + "   |   Carrier: " + offer.carrier + "   |   OTP Length: " + (offer.otp_length || 4), ML);
      doc.fontSize(10).fillColor(GRAY).text("Publisher: " + publisher.name, ML);
      doc.fontSize(10).fillColor(GRAY).text("API Key: " + publisher.api_key, ML);
      doc.moveDown(0.5);

      // Divider
      doc.rect(ML, doc.y, CW, 1).fill("#e2e8f0");
      doc.y = doc.y + 10;

      // ── HELPER: URL Box ───────────────────────────────────────
      const drawURLBox = (url) => {
        const lines = Math.ceil(url.length / 80);
        const boxH = Math.max(lines * 12 + 20, 36);
        const boxY = doc.y;
        doc.rect(ML, boxY, CW, boxH).fill(BG);
        doc.fontSize(8).fillColor(GREEN).text(url, ML + 8, boxY + 10, { width: CW - 16 });
        doc.y = boxY + boxH + 8;
      };

      // ── PIN SEND ─────────────────────────────────────────────
      doc.fontSize(13).fillColor(DARK).text("1. PIN SEND (Generate OTP)", ML);
      doc.fontSize(10).fillColor(GRAY).text("Initialize the subscription flow with user's mobile number.", ML);
      doc.y = doc.y + 6;
      drawURLBox(pinSendURL);
      doc.y = doc.y + 4;

      doc.fontSize(10).fillColor(DARK).text("Parameters:", ML);
      doc.y = doc.y + 4;
      drawTable(doc, [
        ["offer_id",   String(offer.id),      "Offer identifier"],
        ["msisdn",     "{msisdn}",             "User mobile number with country code"],
        ["geo",        offer.geo,              "Country code"],
        ["carrier",    offer.carrier,          "Carrier name"],
        ["x-api-key",  publisher.api_key,      "Your publisher API key"],
      ], ML);
      doc.y = doc.y + 20;

      // ── PIN VERIFY ───────────────────────────────────────────
      doc.fontSize(13).fillColor(DARK).text("2. PIN VERIFY (Confirm OTP)", ML);
      doc.fontSize(10).fillColor(GRAY).text("Confirm the OTP entered by user to complete subscription.", ML);
      doc.y = doc.y + 6;
      drawURLBox(verifyURL);
      doc.y = doc.y + 4;

      doc.fontSize(10).fillColor(DARK).text("Parameters:", ML);
      doc.y = doc.y + 4;
      drawTable(doc, [
        ["session_token", "{session_token}", "Returned in PIN SEND response"],
        ["otp",           "{otp}",           "OTP entered by user"],
        ["x-api-key",     publisher.api_key, "Your publisher API key"],
      ], ML);
      doc.y = doc.y + 20;

      // ── STATUS CHECK ─────────────────────────────────────────
      if (statusURL) {
        doc.fontSize(13).fillColor(DARK).text("3. STATUS CHECK", ML);
        doc.y = doc.y + 6;
        drawURLBox(statusURL);
        doc.y = doc.y + 20;
      }

      // ── PORTAL STEP ──────────────────────────────────────────
      if (portalURL) {
        doc.fontSize(13).fillColor(DARK).text("3. PORTAL STEP", ML);
        doc.fontSize(10).fillColor(GRAY).text("User will be redirected to advertiser portal for final confirmation.", ML);
        doc.y = doc.y + 6;
        drawURLBox(portalURL);
        doc.y = doc.y + 20;
      }

      // ── ANTIFRAUD ─────────────────────────────────────────────
      if (antifraudURL) {
        const num = portalURL ? "4" : "3";
        doc.fontSize(13).fillColor(DARK).text(`${num}. ANTIFRAUD CHECK`, ML);
        doc.fontSize(10).fillColor(GRAY).text("Antifraud verification before processing subscription.", ML);
        doc.y = doc.y + 6;
        drawURLBox(antifraudURL);
        doc.y = doc.y + 20;
      }

      // ── ACTIVE PARAMETERS ────────────────────────────────────
      if (params && params.length > 0) {
        doc.fontSize(13).fillColor(DARK).text("Active Parameters (Advertiser Request)", ML);
        doc.y = doc.y + 4;
        drawTable(doc, params.map(p => [p.param_key, p.param_value, "Active parameter"]), ML);
        doc.y = doc.y + 20;
      }

      // ── FOOTER ───────────────────────────────────────────────


      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}


function drawTable(doc, rows, x) {
  const cols = [160, 160, 175];
  const headers = ["Parameter", "Value", "Description"];
  let y = doc.y;

  // Header row
  doc.rect(x, y, 495, 18).fill("#1e293b");
  let cx = x + 6;
  headers.forEach((h, i) => {
    doc.fontSize(9).fillColor(WHITE).text(h, cx, y + 5, { width: cols[i], lineBreak: false });
    cx += cols[i];
  });
  y += 18;

  // Data rows
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? "#f8fafc" : "#ffffff";
    doc.rect(x, y, 495, 18).fill(bg);
    cx = x + 6;
    row.forEach((cell, ci) => {
      const color = ci === 0 ? "#e94560" : ci === 1 ? "#0369a1" : "#475569";
      doc.fontSize(8.5).fillColor(color).text(String(cell || ""), cx, y + 5, { width: cols[ci] - 4, lineBreak: false, ellipsis: true });
      cx += cols[ci];
    });
    y += 18;
  });
  doc.y = y;
}

/* ── HTML DOCS ─────────────────────────────────────── */
router.get("/publisher/:pubId/offer/:offerId/docs", async (req, res) => {
  try {
    const { pubId, offerId } = req.params;
    const { format } = req.query;

    const data = await getDocsData(pubId, offerId);
    const { publisher, offer, pinSendURL, verifyURL, statusURL, params } = data;

    if (format === "pdf") {
      const pdfBuffer = await generatePDF(data);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="API_Docs_${offer.display_name}_${offer.geo}_${offer.carrier}.pdf"`);
      return res.end(pdfBuffer);
    }

    // HTML response
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>API Docs: ${offer.display_name}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 860px; margin: 0 auto; padding: 32px; background: #f8fafc; color: #1e293b; }
  h1 { color: #1e293b; } span.red { color: #e94560; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; background: #e8f4fd; color: #0369a1; margin-right: 6px; }
  .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .url-box { background: #0a0f1e; color: #22c55e; padding: 14px 18px; border-radius: 8px; font-family: monospace; font-size: 13px; word-break: break-all; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #1e293b; color: #fff; padding: 9px 12px; text-align: left; font-size: 12px; }
  td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  td:first-child { color: #e94560; font-weight: 600; }
  td:nth-child(2) { color: #0369a1; font-family: monospace; }
  .btn { display: inline-block; padding: 10px 20px; background: #e94560; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; margin-bottom: 20px; }
</style>
</head>
<body>
  <h1><span class="red">mob13r</span> — API Documentation: ${offer.display_name}</h1>
  <p><span class="badge">Geo: ${offer.geo}</span><span class="badge">Carrier: ${offer.carrier}</span><span class="badge">OTP: ${offer.otp_length || 4} digits</span></p>
  <a class="btn" href="/api/publisher/${pubId}/offer/${offerId}/docs?format=pdf">⬇ Download PDF</a>
  <hr style="margin-bottom:20px; border:none; border-top:1px solid #e2e8f0;">

  <div class="card">
    <h2>1. PIN SEND (Generate OTP)</h2>
    <p>Initialize the subscription flow with user's mobile number.</p>
    <div class="url-box">${pinSendURL}</div>
    <table><thead><tr><th>Parameter</th><th>Value</th><th>Description</th></tr></thead><tbody>
      <tr><td>offer_id</td><td>${offerId}</td><td>Offer identifier</td></tr>
      <tr><td>msisdn</td><td>{msisdn}</td><td>User mobile number with country code</td></tr>
      <tr><td>geo</td><td>${offer.geo}</td><td>Country code</td></tr>
      <tr><td>carrier</td><td>${offer.carrier}</td><td>Carrier name</td></tr>
      <tr><td>x-api-key</td><td>${publisher.api_key}</td><td>Your publisher API key</td></tr>
    </tbody></table>
  </div>

  <div class="card">
    <h2>2. PIN VERIFY (Confirm OTP)</h2>
    <p>Confirm the OTP entered by user to complete the subscription.</p>
    <div class="url-box">${verifyURL}</div>
    <table><thead><tr><th>Parameter</th><th>Value</th><th>Description</th></tr></thead><tbody>
      <tr><td>session_token</td><td>{session_token}</td><td>Returned from PIN SEND response</td></tr>
      <tr><td>otp</td><td>{otp}</td><td>OTP entered by user</td></tr>
      <tr><td>x-api-key</td><td>${publisher.api_key}</td><td>Your publisher API key</td></tr>
    </tbody></table>
  </div>

  ${statusURL ? `
  <div class="card">
    <h2>3. STATUS CHECK</h2>
    <p>Verify the subscription status.</p>
    <div class="url-box">${statusURL}</div>
    <table><thead><tr><th>Parameter</th><th>Value</th><th>Description</th></tr></thead><tbody>
      <tr><td>session_token</td><td>{session_token}</td><td>Session token</td></tr>
      <tr><td>x-api-key</td><td>${publisher.api_key}</td><td>Publisher API key</td></tr>
    </tbody></table>
  </div>` : ""}

  ${portalURL ? `
  <div class="card">
    <h2>${statusURL ? "4" : "3"}. PORTAL STEP</h2>
    <p>Redirect user to advertiser portal for final confirmation.</p>
    <div class="url-box">${portalURL}</div>
  </div>` : ""}

  ${antifraudURL ? `
  <div class="card">
    <h2>${[statusURL, portalURL].filter(Boolean).length + 3}. ANTIFRAUD CHECK</h2>
    <p>Antifraud verification before processing subscription.</p>
    <div class="url-box">${antifraudURL}</div>
    <table><thead><tr><th>Parameter</th><th>Value</th><th>Description</th></tr></thead><tbody>
      <tr><td>session_token</td><td>{session_token}</td><td>Session token</td></tr>
      <tr><td>x-api-key</td><td>${publisher.api_key}</td><td>Publisher API key</td></tr>
    </tbody></table>
  </div>` : ""}

  ${params.length > 0 ? `
  <div class="card">
    <h2>Active Parameters</h2>
    <table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>
      ${params.map(p => `<tr><td>${p.param_key}</td><td>${p.param_value}</td></tr>`).join("")}
    </tbody></table>
  </div>` : ""}


</body></html>`);

  } catch (err) {
    console.error("Docs error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ── PDF DOWNLOAD ───────────────────────────────────── */
router.get("/publisher/:pubId/offer/:offerId/download-pdf", async (req, res) => {
  try {
    const { pubId, offerId } = req.params;
    const data = await getDocsData(pubId, offerId);
    const pdfBuffer = await generatePDF(data);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition",
      `attachment; filename="API_Docs_${data.offer.display_name}_${data.offer.geo}_${data.offer.carrier}.pdf"`.replace(/\s+/g, "_"));
    res.end(pdfBuffer);
  } catch (err) {
    console.error("PDF download error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
