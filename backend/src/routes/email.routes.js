import express from "express";
import nodemailer from "nodemailer";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

/* GET docs data helper */
async function getDocsData(pubId, offerId, orgId) {
  const pubRes = await pool.query(
    "SELECT id, api_key, name FROM publishers WHERE id=$1 AND org_id=$2",
    [pubId, orgId]
  );
  if (!pubRes.rows.length) throw new Error("Publisher not found");
  const publisher = pubRes.rows[0];

  const offerRes = await pool.query(
    `SELECT o.id, o.geo, o.carrier, o.service_name, o.otp_length,
            o.pin_send_url, o.pin_verify_url, o.check_status_url, o.portal_url,
            o.has_antifraud, o.has_status_check, o.has_portal_step, o.af_prepare_url,
            COALESCE(po.pub_offer_name, o.service_name) AS display_name
     FROM offers o
     LEFT JOIN publisher_offers po ON po.offer_id = o.id AND po.publisher_id = $2
     WHERE o.id = $1 AND o.org_id = $3 LIMIT 1`,
    [offerId, pubId, orgId]
  );
  if (!offerRes.rows.length) throw new Error("Offer not found");
  const offer = offerRes.rows[0];

  const paramsRes = await pool.query(
    `SELECT param_key, param_value FROM offer_parameters WHERE offer_id=$1 AND is_active=true ORDER BY id`,
    [offerId]
  );

  const BASE = "https://backend.mob13r.com";
  const pinSendURL   = `${BASE}/api/publisher/pin/send?offer_id=${offerId}&msisdn={msisdn}&geo=${offer.geo}&carrier=${offer.carrier}&x-api-key=${publisher.api_key}`;
  const verifyURL    = `${BASE}/api/publisher/pin/verify?session_token={session_token}&otp={otp}&x-api-key=${publisher.api_key}`;
  const statusURL    = offer.has_status_check
    ? (offer.check_status_url || `${BASE}/api/publisher/status/check?session_token={session_token}&x-api-key=${publisher.api_key}`)
    : null;
  const portalURL    = offer.has_portal_step
    ? (offer.portal_url || `${BASE}/api/publisher/portal?session_token={session_token}&x-api-key=${publisher.api_key}`)
    : null;
  const antifraudURL = offer.has_antifraud
    ? (offer.af_prepare_url || `${BASE}/api/publisher/antifraud/prepare?session_token={session_token}&x-api-key=${publisher.api_key}`)
    : null;

  return { publisher, offer, pinSendURL, verifyURL, statusURL, portalURL, antifraudURL, params: paramsRes.rows };
}

/* Build HTML email body */
function buildEmailHTML({ publisher, offer, pinSendURL, verifyURL, statusURL, portalURL, antifraudURL, params }) {
  const paramRows = (rows) => rows.map(([k, v, d]) => `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;color:#e94560;font-weight:600;font-family:monospace;font-size:13px;">${k}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;color:#0369a1;font-family:monospace;font-size:13px;word-break:break-all;">${v}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f0f0f0;color:#475569;font-size:13px;">${d}</td>
    </tr>`).join("");

  const table = (rows) => `
    <table style="width:100%;border-collapse:collapse;margin-top:10px;margin-bottom:16px;">
      <thead>
        <tr style="background:#1e293b;">
          <th style="padding:9px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;">Parameter</th>
          <th style="padding:9px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;">Value</th>
          <th style="padding:9px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;">Description</th>
        </tr>
      </thead>
      <tbody>${paramRows(rows)}</tbody>
    </table>`;

  const urlBox = (url) => `
    <div style="background:#0a0f1e;color:#22c55e;padding:14px 18px;border-radius:8px;font-family:monospace;font-size:12px;word-break:break-all;margin:10px 0 14px;">
      ${url}
    </div>`;

  const section = (num, title, subtitle, url, rows) => `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 6px;color:#1e293b;font-size:15px;">${num}. ${title}</h3>
      <p style="margin:0 0 10px;color:#64748b;font-size:13px;">${subtitle}</p>
      ${urlBox(url)}
      ${table(rows)}
    </div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:24px;">

    <!-- Header -->
    <div style="background:#1a1a2e;border-radius:12px 12px 0 0;padding:24px 28px;">
      <span style="color:#e94560;font-size:22px;font-weight:700;">mob13r</span>
      <span style="color:#fff;font-size:18px;font-weight:400;"> — API Documentation</span>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;">Publisher Integration Guide</p>
    </div>

    <!-- Offer Info -->
    <div style="background:#1e293b;padding:16px 28px;border-bottom:3px solid #e94560;">
      <span style="background:#e94560;color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;margin-right:8px;">Service: ${offer.display_name}</span>
      <span style="background:#334155;color:#94a3b8;padding:3px 10px;border-radius:20px;font-size:12px;margin-right:8px;">Geo: ${offer.geo}</span>
      <span style="background:#334155;color:#94a3b8;padding:3px 10px;border-radius:20px;font-size:12px;margin-right:8px;">Carrier: ${offer.carrier}</span>
      <span style="background:#334155;color:#94a3b8;padding:3px 10px;border-radius:20px;font-size:12px;">OTP: ${offer.otp_length || 4} digits</span>
    </div>

    <!-- Publisher Info -->
    <div style="background:#f1f5f9;padding:12px 28px;border-left:4px solid #e94560;margin-bottom:20px;">
      <p style="margin:0;color:#475569;font-size:13px;">
        <strong>Publisher:</strong> ${publisher.name} &nbsp;|&nbsp;
        <strong>API Key:</strong> <code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:12px;">${publisher.api_key}</code>
      </p>
    </div>

    <!-- PIN SEND -->
    ${section("1", "PIN SEND (Generate OTP)",
      "Initialize the subscription flow with user's mobile number.",
      pinSendURL,
      [
        ["offer_id",   String(offer.id),      "Offer identifier"],
        ["msisdn",     "{msisdn}",             "User mobile number with country code"],
        ["geo",        offer.geo,              "Country code"],
        ["carrier",    offer.carrier,          "Carrier name"],
        ["x-api-key",  publisher.api_key,      "Your publisher API key"],
      ]
    )}

    <!-- PIN VERIFY -->
    ${section("2", "PIN VERIFY (Confirm OTP)",
      "Confirm the OTP entered by user to complete the subscription.",
      verifyURL,
      [
        ["session_token", "{session_token}", "Returned in PIN SEND response"],
        ["otp",           "{otp}",           "OTP entered by user"],
        ["x-api-key",     publisher.api_key, "Your publisher API key"],
      ]
    )}

    ${statusURL ? section("3", "STATUS CHECK",
      "Verify the subscription status.",
      statusURL,
      [
        ["session_token", "{session_token}", "Session token from PIN SEND"],
        ["x-api-key",     publisher.api_key, "Your publisher API key"],
      ]
    ) : ""}

    ${portalURL ? `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 6px;color:#1e293b;font-size:15px;">${statusURL ? "4" : "3"}. PORTAL STEP</h3>
      <p style="margin:0 0 10px;color:#64748b;font-size:13px;">Redirect user to advertiser portal for final confirmation.</p>
      <div style="background:#0a0f1e;color:#22c55e;padding:14px 18px;border-radius:8px;font-family:monospace;font-size:12px;word-break:break-all;">${portalURL}</div>
    </div>` : ""}

    ${antifraudURL ? `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 6px;color:#1e293b;font-size:15px;">${[statusURL,portalURL].filter(Boolean).length + 3}. ANTIFRAUD</h3>
      <p style="margin:0;color:#92400e;background:#fef3c7;padding:10px 14px;border-radius:8px;font-size:13px;">
        ✅ Antifraud verification is handled <strong>automatically by mob13r</strong> before each PIN request. No additional integration required.
      </p>
    </div>` : ""}

    ${portalURL ? `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 6px;color:#1e293b;font-size:15px;">${statusURL ? "4" : "3"}. PORTAL STEP</h3>
      <p style="margin:0 0 10px;color:#64748b;font-size:13px;">Redirect user to advertiser portal for final confirmation.</p>
      <div style="background:#0a0f1e;color:#22c55e;padding:14px 18px;border-radius:8px;font-family:monospace;font-size:12px;word-break:break-all;">${portalURL}</div>
    </div>` : ""}

    ${antifraudURL ? `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 6px;color:#1e293b;font-size:15px;">${[statusURL,portalURL].filter(Boolean).length+3}. ANTIFRAUD CHECK</h3>
      <p style="margin:0 0 10px;color:#64748b;font-size:13px;">Antifraud verification before processing subscription.</p>
      <div style="background:#0a0f1e;color:#22c55e;padding:14px 18px;border-radius:8px;font-family:monospace;font-size:12px;word-break:break-all;">${antifraudURL}</div>
    </div>` : ""}

    ${params.length > 0 ? `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 12px;color:#1e293b;font-size:15px;">Active Parameters (Advertiser Request)</h3>
      ${table(params.map(p => [p.param_key, p.param_value, "Active parameter"]))}
    </div>` : ""}


  </div>
</body>
</html>`;
}

/* POST /api/email/send-docs */
router.post("/email/send-docs", orgAuth, async (req, res) => {
  try {
    const { publisher_id, offer_id, to_email, custom_message } = req.body;
    if (!publisher_id || !offer_id || !to_email) {
      return res.status(400).json({ status: "FAILED", error: "publisher_id, offer_id, to_email required" });
    }

    const data = await getDocsData(publisher_id, offer_id, req.orgId);
    const { publisher, offer } = data;
    const htmlBody = buildEmailHTML(data);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const subject = `API Integration Docs — ${offer.display_name} (${offer.geo} | ${offer.carrier})`;

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "mob13r Platform"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: to_email,
      subject,
      html: custom_message
        ? htmlBody.replace("</body>", `<div style="max-width:700px;margin:0 auto 0;padding:0 24px 24px;"><div style="background:#fff8ed;border-left:4px solid #f59e0b;border-radius:8px;padding:14px 18px;font-size:14px;color:#92400e;">${custom_message}</div></div></body>`)
        : htmlBody,
    });

    // Log email
    await pool.query(
      `INSERT INTO email_logs (publisher_id, offer_id, to_email, subject, status, org_id, sent_at)
       VALUES ($1,$2,$3,$4,'sent',$5,NOW())`,
      [publisher_id, offer_id, to_email, subject, req.orgId]
    ).catch(() => {});

    res.json({ status: "SUCCESS", message: `Email sent to ${to_email}` });

  } catch (err) {
    console.error("Email error:", err);
    await pool.query(
      `INSERT INTO email_logs (publisher_id, offer_id, to_email, subject, status, error, org_id, sent_at)
       VALUES ($1,$2,$3,'API Docs','failed',$4,$5,NOW())`,
      [req.body.publisher_id, req.body.offer_id, req.body.to_email, err.message, req.orgId]
    ).catch(() => {});
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* GET /api/email/logs */
router.get("/email/logs", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT el.*, p.name AS publisher_name,
              COALESCE(po.pub_offer_name, o.service_name) AS display_name
       FROM email_logs el
       LEFT JOIN publishers p ON p.id = el.publisher_id
       LEFT JOIN offers o ON o.id = el.offer_id
       LEFT JOIN publisher_offers po ON po.publisher_id = el.publisher_id AND po.offer_id = el.offer_id
       WHERE el.org_id = $1 ORDER BY el.sent_at DESC LIMIT 200`,
      [req.orgId]
    );
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

export default router;
