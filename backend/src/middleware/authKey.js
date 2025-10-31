// backend/src/middleware/authKey.js
import pool from "../db.js";

export default async function authKey(req, res, next) {
  try {
    // ✅ Allow CORS preflight
    if (req.method === "OPTIONS") return res.sendStatus(204);

    // ✅ If no admin key exists yet -> allow first setup
    const countResult = await pool.query("SELECT COUNT(*)::int AS total FROM admin_keys");
    if (countResult.rows[0]?.total === 0) return next();

    // ✅ Read API Key from multiple sources
    const apiKey =
      req.header("x-api-key") ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.replace("Bearer ", "")
        : undefined) ||
      req.query.key;

    if (!apiKey) {
      return res.status(401).json({ error: "Missing API Key" });
    }

    const result = await pool.query(
      "SELECT id FROM admin_keys WHERE api_key = $1 LIMIT 1",
      [apiKey]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Invalid API Key" });
    }

    return next();
  } catch (error) {
    console.error("authKey error:", error);
    return res.status(500).json({ error: "Server auth error" });
  }
}
