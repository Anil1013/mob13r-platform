// backend/src/middleware/fraudCheck.js
import pool from "../db.js";
import https from "https";

// Safe HTTPS agent
const agent = new https.Agent({ rejectUnauthorized: false });

// ------------------------------
// Lightweight GEO Reader (Fast)
// ------------------------------
async function getGeo(ip) {
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, { agent });
    const json = await res.json();

    if (json.success === false) return { geo: "", carrier: "" };

    return {
      geo: (json.country_code || "").toUpperCase(),
      carrier: (json.connection?.isp || "")
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace("AS", ""),
    };
  } catch {
    return { geo: "", carrier: "" };
  }
}

export default async function fraudCheck(req, res, next) {
  try {
    // ------------------------------
    // Extract context
    // ------------------------------
    const ip =
      (req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        req.ip ||
        "0.0.0.0")
        .split(",")[0]
        .trim();

    const ua = (req.headers["user-agent"] || "").trim();

    const pub = String(
      req.query.pub_id || req.body?.pub_id || ""
    ).toUpperCase();

    const expectedGeo = (req.query.geo || "").toUpperCase();
    const expectedCarrier = (req.query.carrier || "").toUpperCase();

    // ------------------------------
    // 1. Resolve GEO
    // ------------------------------
    const { geo: realGeo, carrier: realCarrier } = await getGeo(ip);

    // ------------------------------
    // 2. WHITELIST — skip all checks
    // ------------------------------
    try {
      const wl = await pool.query(
        `SELECT 1 FROM fraud_whitelist WHERE pub_id=$1 LIMIT 1`,
        [pub]
      );

      if (wl.rows.length) {
        await logCheck(pub, ip, ua, realGeo, realCarrier, true, {
          reason: "whitelisted_pub",
        });
        return next();
      }
    } catch (err) {
      console.log("Whitelist error:", err);
    }

    // ------------------------------
    // 3. Fraud detection rules
    // ------------------------------
    const alerts = [];

    // A) IP BLACKLIST
    try {
      const bl = await pool.query(
        `SELECT 1 FROM fraud_blacklist WHERE ip=$1 LIMIT 1`,
        [ip]
      );
      if (bl.rows.length) {
        alerts.push({
          reason: "ip_blacklist",
          severity: "high",
          detail: `IP ${ip} is blacklisted`,
        });
      }
    } catch (err) {
      console.log("Blacklist error:", err);
    }

    // B) GEO mismatch
    if (expectedGeo && realGeo && expectedGeo !== realGeo) {
      alerts.push({
        reason: "geo_mismatch",
        severity: "high",
        detail: `Expected ${expectedGeo}, got ${realGeo}`,
      });
    }

    // C) Carrier mismatch
    if (
      expectedCarrier &&
      realCarrier &&
      !realCarrier.includes(expectedCarrier)
    ) {
      alerts.push({
        reason: "carrier_mismatch",
        severity: "medium",
        detail: `Expected ${expectedCarrier}, got ${realCarrier}`,
      });
    }

    // D) Invalid UA
    if (!ua || ua.length < 10) {
      alerts.push({
        reason: "invalid_user_agent",
        severity: "high",
        detail: ua,
      });
    }

    // Bot patterns
    const L = ua.toLowerCase();
    if (
      L.includes("bot") ||
      L.includes("curl") ||
      L.includes("wget") ||
      L.includes("python") ||
      L.includes("scrape")
    ) {
      alerts.push({
        reason: "bot_like_ua",
        severity: "medium",
        detail: ua,
      });
    }

    // E) Rate limit (per IP + per PUB)
    try {
      const r = await pool.query(
        `SELECT COUNT(*)::int AS c
         FROM fraud_checks_log
         WHERE ip=$1 AND pub_id=$2
           AND created_at > NOW() - INTERVAL '60 seconds'`,
        [ip, pub]
      );

      const c = r.rows[0]?.c || 0;

      if (c > 30)
        alerts.push({ reason: "rate_limit_extreme", severity: "high", detail: c });
      else if (c > 15)
        alerts.push({ reason: "rate_limit_high", severity: "medium", detail: c });
      else if (c > 8)
        alerts.push({ reason: "rate_limit_warn", severity: "low", detail: c });
    } catch (err) {
      console.log("Rate limit error:", err);
    }

    // ------------------------------
    // 4. ALWAYS LOG checks
    // ------------------------------
    await logCheck(pub, ip, ua, realGeo, realCarrier, alerts.length === 0, alerts);

    // ------------------------------
    // 5. SAVE alerts
    // ------------------------------
    if (alerts.length > 0) {
      for (const a of alerts) {
        await pool.query(
          `INSERT INTO fraud_alerts 
           (pub_id, ip, ua, geo, carrier, reason, severity, meta, resolved, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,NOW())`,
          [
            pub,
            ip,
            ua,
            realGeo,
            realCarrier,
            a.reason,
            a.severity,
            JSON.stringify({ detail: a.detail }),
          ]
        );
      }
    }

    // ------------------------------
    // 6. Hard block blacklisted IP
    // ------------------------------
    if (alerts.some((a) => a.reason === "ip_blacklist")) {
      return res.redirect("https://google.com");
    }

    // ------------------------------
    // pass click
    // ------------------------------
    return next();
  } catch (err) {
    console.log("fraudCheck crashed:", err);
    // fail-open
    return next();
  }
}

// ==================================================
// Shared logging helper
// ==================================================
async function logCheck(pub, ip, ua, geo, carrier, passed, meta) {
  try {
    await pool.query(
      `INSERT INTO fraud_checks_log 
       (pub_id, ip, ua, geo, carrier, passed, meta, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [pub, ip, ua, geo, carrier, passed, JSON.stringify(meta)]
    );
  } catch (e) {
    console.log("Log insert failed:", e);
  }
}
