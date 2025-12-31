import pool from "../db.js";

export default async function publisherAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        message: "Publisher API key missing",
      });
    }

    // Expect: Authorization: Bearer PUBLISHER_API_KEY
    const apiKey = authHeader.replace("Bearer ", "").trim();

    const result = await pool.query(
      `
      SELECT id, name, status
      FROM publishers
      WHERE api_key = $1
        AND status = 'active'
      `,
      [apiKey]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        message: "Invalid publisher API key",
      });
    }

    // attach publisher to request
    req.publisher = result.rows[0];

    next();
  } catch (err) {
    console.error("PUBLISHER AUTH ERROR:", err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Publisher authentication failed",
    });
  }
}

