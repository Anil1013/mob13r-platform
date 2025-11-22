// backend/src/middleware/fraudCheck.js
// Advanced fraud check middleware
// - consults fraud_whitelist / fraud_blacklist
// - performs basic UA/IP/geo checks
// - logs checks into fraud_checks_log and creates fraud_alerts on suspicious activity
// - fail-open: never block API, but redirect on severe / immediate block cases

import pool from "../db.js";

export default async function fraudCheck(req, res, next) {
  try {
    const ip = (req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.ip || "")
      .split(",")[0].trim();
    const ua = req.headers["user-agent"] || "";
    const pub = String(req.query.pub_id || req.body?.pub_id || "UNKNOWN").toUpperCase();
    const geo = (req.query.geo || req.body?.geo || "").toUpperCase();
    const carrier = (req.query.carrier || req.body?.carrier || "").toUpperCase();

    // 1) whitelist quick-pass
    try {
      const wl = await pool.query("SELECT id FROM fraud_whitelist WHERE pub_id = $1 LIMIT 1", [pub]);
      if (wl.rows.length) {
        // log passed check
        await pool.query(
          `INSERT INTO fraud_checks_log (pub_id, ip, ua, geo, carrier, passed, meta, created_at)
           VALUES ($1,$2,$3,$4,$5, true, $6, NOW())`,
          [pub, ip, ua, geo, carrier, JSON.stringify({ reason: "whitelist" })]
        );
        return next();
      }
    } catch (err) {
      console.warn("fraudCheck: whitelist query error", err);
      // continue fail-open
    }

    // 2) blacklist immediate block (redirect)
    try {
      const bl = await pool.query("SELECT id FROM fraud_blacklist WHERE ip = $1 LIMIT 1", [ip]);
      if (bl.rows.length) {
        console.log("fraudCheck: ip blacklisted", ip);
        // log check & alert
        await pool.query(
          `INSERT INTO fraud_checks_log (pub_id, ip, ua, geo, carrier, passed, meta, created_at)
           VALUES ($1,$2,$3,$4,$5, false, $6, NOW())`,
          [pub, ip, ua, geo, carrier, JSON.stringify({ reason: "blacklist" })]
        );
        // create a fraud_alert entry
        await pool.query(
          `INSERT INTO fraud_alerts (pub_id, ip, ua, geo, carrier, reason, severity, meta, resolved, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [pub, ip, ua, geo, carrier, "ip_blacklist", "high", JSON.stringify({ block: true }), false]
        );
        return res.redirect("https://google.com"); // block redirect
      }
    } catch (err) {
      console.warn("fraudCheck: blacklist query error", err);
    }

    // 3) heuristic checks (create alerts if suspicious)
    const alerts = [];
    // (a) missing/empty UA
    if (!ua || ua.length < 8) {
      alerts.push({ reason: "invalid_ua", severity: "high", detail: "User-Agent missing or too short" });
    }
    // (b) suspicious UA patterns (simple heuristics)
    const uaLower = ua.toLowerCase();
    if (uaLower.includes("python") || uaLower.includes("curl") || uaLower.includes("bot") || uaLower.includes("wget")) {
      alerts.push({ reason: "bot_ua", severity: "medium", detail: "automation UA detected" });
    }
    // (c) geo/carrier mismatch: if tracking link advertises a specific geo/carrier but query doesn't match
    // Note: we don't have the tracking link here — caller (route) could pass expected geo/carrier in req for a stricter check
    // (d) rapid-fire local rate detection (lightweight): count checks from same ip in last minute
    try {
      const rate = await pool.query(
        `SELECT COUNT(*)::int AS c FROM fraud_checks_log WHERE ip = $1 AND created_at > (NOW() - INTERVAL '60 seconds')`,
        [ip]
      );
      const cnt = Number(rate.rows[0]?.c || 0);
      if (cnt > 20) {
        alerts.push({ reason: "rate_limit", severity: "high", detail: `Requests in last minute: ${cnt}` });
      } else if (cnt > 8) {
        alerts.push({ reason: "rate_high", severity: "medium", detail: `Requests in last minute: ${cnt}` });
      }
    } catch (err) {
      console.warn("fraudCheck: rate query error", err);
    }

    // 4) record check in fraud_checks_log (passed = alerts.length === 0)
    const passed = alerts.length === 0;
    try {
      await pool.query(
        `INSERT INTO fraud_checks_log (pub_id, ip, ua, geo, carrier, passed, meta, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [pub, ip, ua, geo, carrier, passed, JSON.stringify({ alerts })]
      );
    } catch (err) {
      console.warn("fraudCheck: failed to insert checks log", err);
    }

    // 5) if suspicious create fraud_alerts rows (do not block; fail-open by default)
    for (const a of alerts) {
      try {
        await pool.query(
          `INSERT INTO fraud_alerts (pub_id, ip, ua, geo, carrier, reason, severity, meta, resolved, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [pub, ip, ua, geo, carrier, a.reason, a.severity, JSON.stringify({ detail: a.detail }), false]
        );
      } catch (err) {
        console.warn("fraudCheck: failed to insert alert", err);
      }
    }

    // 6) If there is a high severity alert, optionally redirect (policy: fail-open unless explicit block)
    const high = alerts.find((x) => x.severity === "high");
    if (high) {
      // don't block silently — create a visible alert but let request proceed normally for analytics.
      // If you prefer to block: uncomment the redirect line below.
      // return res.redirect("https://google.com");
    }

    // continue
    return next();
  } catch (err) {
    console.error("fraudCheck ERROR:", err);
    // fail-open: proceed
    return next();
  }
}
