import express from "express";
import nodemailer from "nodemailer";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";
import fetch from "node-fetch";

const router = express.Router();

/* POST /api/email/send-docs
   Body: { publisher_id, offer_id, to_email, custom_message }
*/
router.post("/email/send-docs", orgAuth, async (req, res) => {
  try {
    const { publisher_id, offer_id, to_email, custom_message } = req.body;

    if (!publisher_id || !offer_id || !to_email) {
      return res.status(400).json({ status: "FAILED", error: "publisher_id, offer_id, to_email required" });
    }

    // Get publisher + offer info
    const infoRes = await pool.query(`
      SELECT p.name AS publisher_name, p.email AS publisher_email,
             o.service_name AS offer_name, o.geo, o.carrier,
             COALESCE(po.pub_offer_name, o.service_name) AS display_name
      FROM publishers p
      JOIN publisher_offers po ON po.publisher_id = p.id AND po.offer_id = $2
      JOIN offers o ON o.id = po.offer_id
      WHERE p.id = $1 AND p.org_id = $3
      LIMIT 1
    `, [publisher_id, offer_id, req.orgId]);

    if (!infoRes.rows.length) {
      return res.status(404).json({ status: "FAILED", error: "Publisher or offer not found" });
    }

    const info = infoRes.rows[0];

    // Fetch PDF from docs route
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";
    const pdfRes = await fetch(
      `${BACKEND_URL}/api/publisher/${publisher_id}/offer/${offer_id}/docs?format=pdf`
    );

    if (!pdfRes.ok) {
      return res.status(500).json({ status: "FAILED", error: "Failed to generate PDF" });
    }

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    // Setup transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const senderName = process.env.SMTP_FROM_NAME || "mob13r Platform";
    const senderEmail = process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: to_email,
      subject: `API Integration Docs — ${info.display_name} (${info.geo} | ${info.carrier})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0;">📡 mob13r</h2>
            <p style="color: #94a3b8; margin: 4px 0 0;">API Integration Documentation</p>
          </div>
          <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #1e293b;">Hi <strong>${info.publisher_name}</strong>,</p>
            <p style="color: #475569;">Please find attached the API integration documentation for:</p>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0; color: #1e293b;"><strong>Offer:</strong> ${info.display_name}</p>
              <p style="margin: 4px 0; color: #1e293b;"><strong>Geo:</strong> ${info.geo}</p>
              <p style="margin: 4px 0; color: #1e293b;"><strong>Carrier:</strong> ${info.carrier}</p>
            </div>
            ${custom_message ? `<p style="color: #475569; border-left: 3px solid #e94560; padding-left: 12px; margin: 16px 0;">${custom_message}</p>` : ""}
            <p style="color: #475569;">The PDF document contains all API endpoints, parameters, and integration guidelines.</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">— mob13r Platform Team</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `API_Docs_${info.display_name}_${info.geo}_${info.carrier}.pdf`.replace(/\s+/g, "_"),
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.json({ status: "SUCCESS", message: `Email sent to ${to_email}` });

  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

export default router;
