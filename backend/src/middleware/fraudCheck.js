// backend/src/middleware/fraudCheck.js
import pool from "../db.js";

/*
  Advanced fraudCheck middleware
  - Skips checks if pub_id is whitelisted (fraud_whitelist)
  - Basic UA / bot checks
  - IP velocity check (using fraud_alerts table as a simple store)
  - Blocked IP check via blocked_ips
  - Logs blocked events into fraud_alerts
  - FAIL-OPEN: on internal errors it calls next() so APIs don't break
*/

export default async function fraudCheck(req, res, next) {
  try {
    const ip =
      (req.headers["x-forwarded-for"] && req.headers["x-forwarded-for"].split(",")[0].trim()) ||
      req.socket?.remoteAddress ||
      req.ip ||
      "0.0.0.0";

    const ua = req.headers["user-agent"] || "";
    const pub = (req.query.pub_id || req.body?.pub_id || "UNKNOWN").toString();
    const geo = (req.query.geo || req.body?.geo || "").toString();

    // Short log for visibility
    console.log(`🔎 FraudCheck → pub=${pub} ip=${ip} geo=${geo} uaLen=${ua.length}`);

    // 1) Whitelist check
    try {
      const wlRes = await pool.query("SELECT 1 FROM fraud_whitelist WHERE pub_id = $1 LIMIT 1", [pub]);
      if (wlRes.rows.length > 0) {
        console.log(`🟢 fraudCheck: pub ${pub} is whitelisted — skipping checks`);
        return next();
      }
    } catch (err) {
      console.warn("fraudCheck: whitelist lookup failed", err);
      // continue (do not block on whitelist lookup error)
    }

    // 2) Basic UA validation
    if (!ua || ua.length < 6) {
      await logAndBlock(pub, ip, ua, "EMPTY_OR_INVALID_UA", { geo });
      return res.redirect("https://google.com");
    }

    // 3) Bot/Script pattern detection
    const botPatterns = ["python", "curl", "wget", "bot", "crawler", "spider", "phantom", "selenium", "headless"];
    if (botPatterns.some((p) => ua.toLowerCase().includes(p))) {
      await logAndBlock(pub, ip, ua, "BOT_OR_EMULATOR", { geo });
      return res.redirect("https://google.com");
    }

    // 4) Blocked IP check
    try {
      const blk = await pool.query("SELECT 1 FROM blocked_ips WHERE ip = $1 LIMIT 1", [ip]);
      if (blk.rows.length > 0) {
        await logAndBlock(pub, ip, ua, "BLOCKED_IP", { geo });
        return res.redirect("https://google.com");
      }
    } catch (err) {
      console.warn("fraudCheck: blocked_ips lookup failed", err);
      // continue
    }

    // 5) Simple click velocity check — count recent fraud_alerts from same IP
    try {
      const velQ = `SELECT COUNT(*)::int AS hits FROM fraud_alerts WHERE ip = $1 AND created_at > NOW() - INTERVAL '30 seconds'`;
      const vel = await pool.query(velQ, [ip]);
      const hits = Number(vel.rows[0]?.hits || 0);
      if (hits > 25) {
        await logAndBlock(pub, ip, ua, "HIGH_CLICK_VELOCITY", { hits, geo });
        return res.redirect("https://google.com");
      }
    } catch (err) {
      console.warn("fraudCheck: velocity check failed", err);
      // continue
    }

    // 6) Optional Geo/IP heuristic example (customize per your infra)
    // Example: if geo provided and ip doesn't match a simple prefix heuristic, flag
    try {
      if (geo && geo.length === 2) {
        // Very lightweight heuristic — change to your geo-to-IP logic
        const geoUpper = geo.toUpperCase();
        if (geoUpper === "BD" && !ip.startsWith("103.")) {
          // Block only as an example — comment out if you don't want this heuristic
          await logAndBlock(pub, ip, ua, "GEO_IP_MISMATCH", { geo });
          return res.redirect("https://google.com");
        }
      }
    } catch (err) {
      console.warn("fraudCheck: geo-ip heuristic failed", err);
      // continue
    }

    // Passed all checks
    return next();
  } catch (err) {
    console.error("fraudCheck ERROR:", err);
    // Fail open: do not break main flow if middleware errors
    return next();
  }
}

// helper: insert into fraud_alerts
async function logAndBlock(pub, ip, ua, reason, meta = {}) {
  try {
    const insertQ = `
      INSERT INTO fraud_alerts (pub_id, ip, user_agent, reason, meta, created_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
    `;
    await pool.query(insertQ, [pub, ip, ua, reason, JSON.stringify(meta)]);
    console.log(`🚫 fraudCheck logged: ${reason} pub=${pub} ip=${ip}`);
  } catch (err) {
    console.warn("fraudCheck: failed to log alert", err);
  }
}
