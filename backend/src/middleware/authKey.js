// backend/src/middleware/authKey.js
import pool from "../db.js";

export default async function authKey(req, res, next) {
  try {
    if (req.method === "OPTIONS") return res.sendStatus(204);

    // ✅ Allow first boot without any key
    const countRes = await pool.query("SELECT COUNT(*)::int AS c FROM admin_keys");
    if (countRes.rows[0]?.c === 0) return next();

    const key =
      req.header("x-api-key") ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined) ||
      req.query.key;

    if (!key) {
      return res.status(401).json({ error: "Missing API Key" });
    }

    const result = await pool.query(
      "SELECT id FROM admin_keys WHERE api_key = $1 LIMIT 1",
      [key]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Invalid API Key" });
    }

    return next();
  } catch (err) {
    console.error("authKey error:", err);
    return res.status(500).json({ error: "Auth error" });
  }
}
