// backend/src/middleware/fraudCheck.js
import pool from "../db.js";
import fetch from "node-fetch";
import https from "https";

// Fix SSL rejection issues in AWS
const agent = new https.Agent({
  rejectUnauthorized: false,
});

export default async function fraudCheck(req, res, next) {
  try {
    // Extract IP
    const ip =
      (req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        req.ip ||
        "")
        .split(",")[0]
        .trim();

    const ua = req.headers["user-agent"] || "";

    const pub = String(
      req.query.pub_id || req.body?.pub_id || "UNKNOWN"
    ).toUpperCase();

    const expectedGeo = (req.query.geo || req.body?.geo || "").toUpperCase();
    const expectedCarrier = (req.query.carrier || req.body?.carrier || "").toUpperCase();

    let realGeo = "";
    let realCarrier = "";

    // --------------------------------------
    // 1) GEO + CARRIER DETECTION (AWS Safe)
    // --------------------------------------
    try {
      const lookup = await fetch(`https://ipapi.co/${ip}/json/`, { agent });
      const data = await lookup.json();

      realGeo = (data.country_code || "").toUpperCase();
      realCarrier = ((data.org || data.asn || "").toUpperCase())
        .replace("AS", "")
        .replace(/\s+/g, "");

    } catch (err) {
      console.log("Geo lookup failed:", err?.message || err);
      realGeo = "";
      realCarrier = "";
    }

    // --------------------------------------
    // 2) WHITELIST CHECK
    // --------------------------------------
    try {
      const wl = await pool.query(
        "SELECT id FROM fraud_whitelist WHERE pub_id = $1 LIMIT 1",
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
    } catch (err) {
      console.log("Whitelist lookup error:", err);
    }

    const alerts = [];

    // --------------------------------------
    // 3) IP BLACKLIST
    // --------------------------------------
    try {
      const bl = await pool.query(
        "SELECT id FROM fraud_blacklist WHERE ip=$1 LIMIT 1",
        [ip]
      );
      if (bl.rows.length) {
        alerts.push({
          reason: "ip_blacklist",
          severity: "high",
          detail: "IP is blacklisted",
        });
      }
    } catch (err) {
      console.log("Blacklist lookup error:", err);
    }

    // --------------------------------------
    // 4) GEO MISMATCH
    // --------------------------------------
    if (expectedGeo && realGeo && expectedGeo !== realGeo) {
      alerts.push({
        reason: "geo_mismatch",
        severity: "high",
        detail: `Expected ${expectedGeo} but got ${realGeo}`,
      });
    }

    // --------------------------------------
    // 5) CARRIER MISMATCH
    // --------------------------------------
    if (
      expectedCarrier &&
      realCarrier &&
      !realCarrier.includes(expectedCarrier.toUpperCase())
    ) {
      alerts.push({
        reason: "carrier_mismatch",
        severity: "medium",
        detail: `Expected ${expectedCarrier} got ${realCarrier}`,
      });
    }

    // --------------------------------------
    // 6) BOT / INVALID UA
    // --------------------------------------
    const uaLower = ua.toLowerCase();
    if (!ua || ua.length < 8) {
      alerts.push({
        reason: "invalid_ua",
        severity: "high",
        detail: "User-Agent too short",
      });
    }

    if (
      uaLower.includes("bot") ||
      uaLower.includes("curl") ||
      uaLower.includes("wget") ||
      uaLower.includes("python")
    ) {
      alerts.push({
        reason: "bot_ua",
        severity: "medium",
        detail: ua,
      });
    }

    // --------------------------------------
    // 7) RATE LIMIT (per IP last 60 sec)
    // --------------------------------------
    try {
      const r = await pool.query(
        `SELECT COUNT(*)::int AS c
         FROM fraud_checks_log
         WHERE ip=$1 AND created_at > NOW() - INTERVAL '60 sec'`,
        [ip]
      );
      const c = r.rows[0].c;

      if (c > 20)
        alerts.push({ reason: "rate_limit", severity: "high", detail: c });
      else if (c > 8)
        alerts.push({ reason: "rate_high", severity: "medium", detail: c });
    } catch (err) {
      console.log("Rate limit lookup error:", err);
    }

    // --------------------------------------
    // 8) ALWAYS LOG CHECKS
    // --------------------------------------
    await pool.query(
      `INSERT INTO fraud_checks_log
       (pub_id, ip, ua, geo, carrier, passed, meta, created_at)
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

    // --------------------------------------
    // 9) STORE ALL ALERTS
    // --------------------------------------
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

    return next();
  } catch (err) {
    console.log("fraudCheck crashed:", err);
    return next(); // fail-open
  }
}
