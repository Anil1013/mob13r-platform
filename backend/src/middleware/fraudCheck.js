// backend/src/middleware/fraudCheck.js
import pool from "../db.js";
import geoip from "geoip-lite"; // optional: add to package.json if you want server-side geo lookup

// Utility: basic UA suspicious check
function isSuspiciousUA(ua) {
  if (!ua) return true;
  const s = ua.toLowerCase();
  const suspicious = ["curl", "bot", "spider", "python-requests", "java/", "wget", "httpclient", "libwww-perl"];
  for (const token of suspicious) if (s.includes(token)) return true;
  return false;
}

export default async function fraudCheck(req, res, next) {
  try {
    const ip = (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
    const ua = req.headers["user-agent"] || "";
    const pub = (req.query.pub_id || req.body?.pub_id || "UNKNOWN").toString();
    const geoParam = (req.query.geo || req.body?.geo || "").toString().toUpperCase();
    const carrierParam = (req.query.carrier || req.body?.carrier || "").toString();

    console.log(`🔎 FraudCheck → PUB: ${pub} | IP: ${ip} | UA: ${ua} | GEO: ${geoParam} | CARRIER: ${carrierParam}`);

    // 0) Admin whitelist: if pub in fraud_whitelist -> bypass checks
    try {
      const wl = await pool.query("SELECT 1 FROM fraud_whitelist WHERE pub_id = $1 LIMIT 1", [pub]);
      if (wl.rows.length) {
        req.fraud = { passed: true, reason: "whitelisted_pub" };
        return next();
      }
    } catch (e) {
      console.warn("fraudCheck: whitelist db check failed", e?.message);
      // continue (fail-open)
    }

    // 1) Blacklist IP: immediate block
    try {
      const bl = await pool.query("SELECT 1 FROM fraud_blacklist WHERE ip = $1 LIMIT 1", [ip]);
      if (bl.rows.length) {
        console.log("🚫 FraudCheck → Blocked (blacklisted IP)");
        await pool.query(
          `INSERT INTO fraud_alerts (pub_id, ip, ua, geo, carrier, reason, severity, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
          [pub, ip, ua, geoParam, carrierParam, "blacklisted_ip", "high"]
        ).catch(() => {});
        return res.redirect("https://google.com");
      }
    } catch (e) {
      console.warn("fraudCheck: blacklist db check failed", e?.message);
    }

    // 2) UA checks
    if (isSuspiciousUA(ua)) {
      console.log("🚫 FraudCheck → Blocked (suspicious UA)");
      await pool.query(
        `INSERT INTO fraud_alerts (pub_id, ip, ua, geo, carrier, reason, severity, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [pub, ip, ua, geoParam, carrierParam, "suspicious_ua", "medium"]
      ).catch(() => {});
      return res.redirect("https://google.com");
    }

    // 3) IP -> GEO mismatch (geo from IP using geoip-lite if available)
    try {
      const geo = geoip?.lookup ? geoip.lookup(ip) : null;
      const ipCountry = (geo?.country || "").toUpperCase();
      if (geoParam && ipCountry && ipCountry !== geoParam.toUpperCase()) {
        // Log alert and block
        console.log(`🚫 FraudCheck → IP geo mismatch: ipCountry=${ipCountry} vs param=${geoParam}`);
        await pool.query(
          `INSERT INTO fraud_alerts (pub_id, ip, ua, geo, carrier, reason, severity, meta, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [pub, ip, ua, geoParam, carrierParam, "ip_geo_mismatch", "high", JSON.stringify({ ipCountry })]
        ).catch(() => {});
        return res.redirect("https://google.com");
      }
    } catch (e) {
      console.warn("fraudCheck: geoip lookup failed", e?.message);
    }

    // 4) Rate / velocity rules using traffic_logs
    try {
      // hits from same IP in last 60 seconds
      const v1 = await pool.query(
        `SELECT COUNT(1) AS c FROM traffic_logs WHERE ip = $1 AND created_at > (NOW() - INTERVAL '60 seconds')`,
        [ip]
      );
      const ipHits = Number(v1.rows[0]?.c || 0);
      if (ipHits > 30) {
        console.log("🚫 FraudCheck → Blocked (ip velocity)");
        await pool.query(
          `INSERT INTO fraud_alerts (pub_id, ip, ua, geo, carrier, reason, severity, meta, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [pub, ip, ua, geoParam, carrierParam, "ip_velocity", "high", JSON.stringify({ ipHits })]
        ).catch(() => {});
        return res.redirect("https://google.com");
      }

      // hits for pub in last 60 seconds
      if (pub && pub !== "UNKNOWN") {
        const v2 = await pool.query(
          `SELECT COUNT(1) AS c FROM traffic_logs WHERE pub_code = $1 AND created_at > (NOW() - INTERVAL '60 seconds')`,
          [pub]
        );
        const pubHits = Number(v2.rows[0]?.c || 0);
        if (pubHits > 1000) {
          console.log("🚫 FraudCheck → Blocked (pub velocity)");
          await pool.query(
            `INSERT INTO fraud_alerts (pub_id, ip, ua, geo, carrier, reason, severity, meta, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
            [pub, ip, ua, geoParam, carrierParam, "pub_velocity", "high", JSON.stringify({ pubHits })]
          ).catch(() => {});
          return res.redirect("https://google.com");
        }
      }
    } catch (e) {
      console.warn("fraudCheck: velocity checks failed", e?.message);
    }

    // 5) Carrier check - optional: if you maintain carrier->ip mapping, check it.
    // (Not implemented here unless you add carrier mapping table)

    // 6) Passed all checks -> optionally log that request passed
    req.fraud = { passed: true };
    // insert a lightweight log of request for auditing (non-blocking)
    pool.query(
      `INSERT INTO fraud_checks_log (pub_id, ip, ua, geo, carrier, passed, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [pub, ip, ua, geoParam, carrierParam, true]
    ).catch(() => {});

    next();
  } catch (err) {
    console.error("❌ fraudCheck error:", err);
    next(); // fail-open so we don't break production traffic
  }
}
