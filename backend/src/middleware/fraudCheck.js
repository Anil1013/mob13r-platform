// backend/src/middleware/fraudCheck.js
import pool from "../db.js";
import requestIp from "request-ip";

// ==============================
// ⚠️ FRAUD CHECK MIDDLEWARE
// ==============================
// This middleware runs BEFORE a click is processed.
// It performs:
// 1. IP Blacklist check
// 2. Device fingerprint fraud check
// 3. High frequency click detection
// 4. PUB_ID block check
// 5. Creates fraud alerts for dashboard
// ==============================

export default async function fraudCheck(req, res, next) {
  try {
    const ip = requestIp.getClientIp(req) || req.ip || req.connection.remoteAddress;
    const ua = req.headers["user-agent"] || "";
    const deviceId = req.query.device_id || req.headers["x-device-id"] || null;
    const pubId = req.query.pub_id || null;

    // ------------------------------
    // 1️⃣ CHECK IP BLACKLIST
    // ------------------------------
    const blk = await pool.query(
      "SELECT id FROM ip_blacklist WHERE ip = $1",
      [ip]
    );

    if (blk.rows.length > 0) {
      await createFraudAlert("BLOCKED_IP", pubId, ip, ua, deviceId, "IP is blacklisted", "high");
      return res.status(403).send("Blocked");
    }

    // ------------------------------
    // 2️⃣ CHECK FRAUD BLOCKS TABLE
    // ------------------------------
    const block = await pool.query(
      `SELECT * FROM fraud_blocks 
       WHERE identifier = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [ip]
    );

    if (block.rows.length) {
      await createFraudAlert("ACTIVE_BLOCK", pubId, ip, ua, deviceId, "Blocked by rule", "high");
      return res.status(403).send("Blocked");
    }

    // ------------------------------
    // 3️⃣ DEVICE FINGERPRINT TRACKING
    // ------------------------------
    if (deviceId) {
      const dev = await pool.query(
        "SELECT * FROM device_fingerprints WHERE device_id = $1",
        [deviceId]
      );

      if (dev.rows.length) {
        const clickCount = dev.rows[0].click_count + 1;

        // update last seen, increment count
        await pool.query(
          `UPDATE device_fingerprints
           SET click_count = $1, last_seen_at = NOW(), ip = $2
           WHERE device_id = $3`,
          [clickCount, ip, deviceId]
        );

        // 🚨 ABNORMAL: more than 30 clicks in 10 minutes
        if (clickCount >= 30) {
          await createFraudAlert(
            "HIGH_FREQUENCY_DEVICE",
            pubId,
            ip,
            ua,
            deviceId,
            { clicks: clickCount },
            "high"
          );
        }
      } else {
        // insert new device
        await pool.query(
          `INSERT INTO device_fingerprints (device_id, user_agent, ip)
           VALUES ($1,$2,$3)`,
          [deviceId, ua, ip]
        );
      }
    }

    // ------------------------------
    // 4️⃣ RAPID IP CLICK CHECK
    //    (same IP > 50 clicks in 5 minutes)
    // ------------------------------
    const rapidCheck = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM traffic_logs
       WHERE ip = $1 AND created_at > NOW() - INTERVAL '5 minutes'`,
      [ip]
    );

    const ipClicks = Number(rapidCheck.rows[0].cnt);

    if (ipClicks > 50) {
      await createFraudAlert(
        "HIGH_FREQUENCY_IP",
        pubId,
        ip,
        ua,
        deviceId,
        { clicks_last_5min: ipClicks },
        "medium"
      );
    }

    // PASSED ALL CHECKS
    next();
  } catch (err) {
    console.error("🚨 FRAUD CHECK ERROR:", err);
    next(); // do not block traffic if fraud system fails
  }
}

// =====================================================
// Helper → Create Fraud Alert Entry
// =====================================================
async function createFraudAlert(source, pubId, ip, ua, deviceId, details, severity = "medium") {
  try {
    await pool.query(
      `INSERT INTO fraud_alerts 
       (source, pub_id, ip, user_agent, device_id, details, severity)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        source,
        pubId,
        ip,
        ua,
        deviceId,
        typeof details === "object" ? JSON.stringify(details) : details,
        severity
      ]
    );
  } catch (err) {
    console.error("⚠️ Failed to insert fraud_alert:", err);
  }
}
