// backend/src/middleware/fraudCheck.js
import pool from "../db.js";
import fetch from "node-fetch";

export default async function fraudCheck(req, res, next) {
  try {
    const ip = (req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.ip ||
      "").split(",")[0].trim();

    const ua = req.headers["user-agent"] || "";

    const pub = String(req.query.pub_id || req.body?.pub_id || "UNKNOWN").toUpperCase();
    const expectedGeo = (req.query.geo || req.body?.geo || "").toUpperCase();
    const expectedCarrier = (req.query.carrier || req.body?.carrier || "").toUpperCase();

    let realGeo = "";
    let realCarrier = "";

    // -------------------------------
    // 1) AUTO-DETECT GEO + CARRIER
    // -------------------------------
    try {
      const lookup = await fetch(`https://ipapi.co/${ip}/json/`);
      const data = await lookup.json();

      realGeo = (data.country_code || "").toUpperCase();
      realCarrier = (data.org || data.asn || "").toUpperCase();

    } catch (e) {
      console.log("Geo lookup failed", e);
    }

    // -------------------------------
    // 2) WHITELIST → auto-pass
    // -------------------------------
    try {
      const wl = await pool.query(
        "SELECT id FROM fraud_whitelist WHERE pub_id=$1 LIMIT 1",
        [pub]
      );
      if (wl.rows.length) {
        await pool.query(
          `INSERT INTO fraud_checks_log (pub_id, ip, ua, geo, carrier, passed, meta, created_at)
          VALUES ($1,$2,$3,$4,$5,true,$6,NOW())`,
          [pub, ip, ua, realGeo, realCarrier, JSON.stringify({ reason: "whitelist" })]
        );
        return next();
      }
    } catch (err) {}

    const alerts = [];

    // -------------------------------
    // 3) BLACKLIST IP → block
    // -------------------------------
    try {
      const bl = await pool.query(
        "SELECT id FROM fraud_blacklist WHERE ip=$1 LIMIT 1",
        [ip]
      );
      if (bl.rows.length) {
        alerts.push({
          reason: "ip_blacklist",
          severity: "high",
          detail: "IP blacklisted"
        });
      }
    } catch (err) {}

    // -------------------------------
    // 4) GEO MISMATCH
    // -------------------------------
    if (expectedGeo && realGeo && expectedGeo !== realGeo) {
      alerts.push({
        reason: "geo_mismatch",
        severity: "high",
        detail: `Expected ${expectedGeo}, got ${realGeo} from IP`
      });
    }

    // -------------------------------
    // 5) CARRIER MISMATCH
    // -------------------------------
    if (
      expectedCarrier &&
      realCarrier &&
      !realCarrier.includes(expectedCarrier)
    ) {
      alerts.push({
        reason: "carrier_mismatch",
        severity: "medium",
        detail: `Expected ${expectedCarrier}, got ${realCarrier}`
      });
    }

    // -------------------------------
    // 6) BOT UA Checks
    // -------------------------------
    const uaLower = ua.toLowerCase();
    if (!ua || ua.length < 8)
      alerts.push({ reason: "invalid_ua", severity: "high" });

    if (
      uaLower.includes("curl") ||
      uaLower.includes("bot") ||
      uaLower.includes("python") ||
      uaLower.includes("wget")
    ) {
      alerts.push({ reason: "bot_ua", severity: "medium" });
    }

    // -------------------------------
    // 7) Rate limit (per IP)
    // -------------------------------
    try {
      const r = await pool.query(
        `SELECT COUNT(*)::int AS c FROM fraud_checks_log
         WHERE ip=$1 AND created_at > NOW()-INTERVAL '60 seconds'`,
        [ip]
      );
      const c = r.rows[0].c;
      if (c > 20)
        alerts.push({ reason: "rate_limit", severity: "high", detail: c });
      else if (c > 8)
        alerts.push({ reason: "rate_high", severity: "medium", detail: c });
    } catch (err) {}

    // -------------------------------
    // 8) Log Check
    // -------------------------------
    await pool.query(
      `INSERT INTO fraud_checks_log (pub_id, ip, ua, geo, carrier, passed, meta, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [
        pub,
        ip,
        ua,
        realGeo,
        realCarrier,
        alerts.length === 0,
        JSON.stringify(alerts),
      ]
    );

    // -------------------------------
    // 9) INSERT ALERTS
    // -------------------------------
    for (const a of alerts) {
      await pool.query(
        `INSERT INTO fraud_alerts (pub_id, ip, ua, geo, carrier, reason, severity, meta, resolved, created_at)
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

    return next();
  } catch (e) {
    console.log("fraudCheck error", e);
    return next(); // fail-open
  }
}
