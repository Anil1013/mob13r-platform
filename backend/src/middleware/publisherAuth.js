import pool from "../db.js";

export default async function publisherAuth(req, res, next) {
  try {
    /* =====================================================
       ✅ READ API KEY (HEADER + BEARER + QUERY SUPPORT)
       ===================================================== */

    let apiKey =
      req.headers["x-publisher-key"] ||
      req.headers["x-api-key"] ||
      (req.headers.authorization
        ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
        : null);

    /* ✅ Browser Testing Support */
    if (!apiKey && req.query["x-api-key"]) {
      apiKey = req.query["x-api-key"];
    }

    /* =====================================================
       OPTIONAL DEBUG LOG (SAFE, NO SECRETS)
       ===================================================== */
    if (process.env.NODE_ENV !== "production") {
      console.log("Publisher auth attempt", {
        hasApiKey: Boolean(apiKey),
        path: req.path,
        method: req.method,
      });
    }

    /* =====================================================
       API KEY REQUIRED
       ===================================================== */
    if (!apiKey) {
      return res.status(401).json({
        status: "UNAUTHORIZED",
        message: "Publisher API key missing",
      });
    }

    /* =====================================================
       VERIFY PUBLISHER
       ===================================================== */
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

    /* =====================================================
       ATTACH PUBLISHER CONTEXT
       ===================================================== */
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
