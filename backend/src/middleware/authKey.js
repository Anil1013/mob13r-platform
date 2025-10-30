import pool from "../db.js";

export default async function authKey(req, res, next) {
  try {
    const key = req.headers["x-api-key"];

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

    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
