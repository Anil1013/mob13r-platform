// backend/src/middleware/authKey.js
import pool from "../db.js";

export default async function authKey(req, res, next) {
  try {
    // ✅ CORS preflight ko kabhi block na karo
    if (req.method === "OPTIONS") return res.sendStatus(204);

    // ✅ Agar abhi tak koi key bani hi nahi, bootstrap allow
    const cntRes = await pool.query("SELECT COUNT(*)::int AS c FROM admin_keys");
    if (cntRes.rows[0]?.c === 0) return next();

    // ✅ Key read karo multiple places se
    const headerKey =
      req.header("x-api-key") ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined) ||
      req.query.key;

    if (!headerKey) {
      return res.status(401).json({ error: "Missing API Key" });
    }

    const result = await pool.query(
      "SELECT id FROM admin_keys WHERE api_key = $1 LIMIT 1",
      [headerKey]
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
