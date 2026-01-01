import pool from "../db.js";

export default async function publisherAuth(req, res, next) {
  try {
    /* ===============================
       READ API KEY FROM HEADERS
       =============================== */

    const apiKey =
      req.headers["x-publisher-key"] ||
      req.headers["x-api-key"] ||
      (req.headers.authorization
        ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
        : null);

    // DEBUG (temporary – remove after testing)
    console.log("PUBLISHER AUTH HEADERS:", req.headers);
    console.log("PUBLISHER API KEY RESOLVED:", apiKey);

    if (!apiKey) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        message: "Publisher API key missing",
      });
    }

    /* ===============================
       VERIFY PUBLISHER
       =============================== */

    const result = await pool.query(
      `
      SELECT id, name, status
      FROM publishers
      WHERE api_key = $1
        AND status = 'active'
      LIMIT 1
      `,
      [apiKey]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        message: "Invalid publisher API key",
      });
    }

    /* ===============================
       ATTACH PUBLISHER TO REQUEST
       =============================== */

    req.publisher = {
      id: result.rows[0].id,
      name: result.rows[0].name,
    };

    next();
  } catch (err) {
    console.error("PUBLISHER AUTH ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Publisher authentication failed",
    });
  }
}
