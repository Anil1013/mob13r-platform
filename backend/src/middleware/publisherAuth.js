import pool from "../db.js";
import jwt from "jsonwebtoken";

export default async function publisherAuth(req, res, next) {
  try {
    let apiKey =
      req.headers["x-publisher-key"] ||
      req.headers["x-api-key"] ||
      (req.headers.authorization
        ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
        : null);

    if (!apiKey && req.query["x-api-key"]) {
      apiKey = req.query["x-api-key"];
    }

    if (!apiKey) {
      return res.status(401).json({ status: "UNAUTHORIZED", message: "Publisher API key missing" });
    }

    try {
      const decoded = jwt.verify(apiKey, process.env.JWT_SECRET || "mob13r_secret");
      if (decoded?.role === "admin") {
        const publisherId = req.query.publisher_id || 1;
        const result = await pool.query("SELECT id, name FROM publishers WHERE id = $1 LIMIT 1", [publisherId]);
        if (result.rows.length) {
          req.publisher = { id: result.rows[0].id, name: result.rows[0].name, api_key: apiKey, is_admin: true };
          return next();
        }
      }
    } catch { }

    const result = await pool.query(
      "SELECT id, name, status FROM publishers WHERE api_key = $1 AND status = 'active' LIMIT 1",
      [apiKey]
    );

    if (!result.rows.length) {
      return res.status(401).json({ status: "UNAUTHORIZED", message: "Invalid publisher API key" });
    }

    req.publisher = { id: result.rows[0].id, name: result.rows[0].name, api_key: apiKey };
    next();

  } catch (err) {
    console.error("PUBLISHER AUTH ERROR:", err);
    return res.status(500).json({ status: "FAILED", message: "Publisher authentication failed" });
  }
}
