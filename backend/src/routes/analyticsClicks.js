// backend/src/routes/analyticsClicks.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";
import { Parser as Json2csvParser } from "json2csv";

const router = express.Router();

/**
 * CLICK ANALYTICS
 * GET /api/analytics/clicks
 *
 * Query params:
 *  - pub_id
 *  - offer_id
 *  - geo
 *  - carrier
 *  - q (search in ip / ua)
 *  - from (YYYY-MM-DD)
 *  - to   (YYYY-MM-DD)
 *  - group = none | hour | day
 *  - limit, offset
 *  - format = csv   → exports CSV
 */
router.get("/", authJWT, async (req, res) => {
  try {
    let {
      from,
      to,
      pub_id,
      offer_id,
      geo,
      carrier,
      q,
      group = "none",
      limit = 200,
      offset = 0,
      format,
    } = req.query;

    limit = Number(limit) || 200;
    offset = Number(offset) || 0;

    // ---------------------------
    // DATE DEFAULTS (today)
    // ---------------------------
    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

    const finalFrom = from || today;
    const finalTo = to || today;

    const params = [];
    let where = "WHERE 1=1";

    // created_at BETWEEN [from, to+1day)
    if (finalFrom) {
      params.push(finalFrom);
      where += ` AND ac.created_at >= $${params.length}::date`;
    }

    if (finalTo) {
      params.push(finalTo);
      // include whole "to" day
      where += ` AND ac.created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    if (pub_id) {
      params.push(pub_id.toUpperCase());
      where += ` AND ac.pub_id = $${params.length}`;
    }

    if (offer_id) {
      params.push(Number(offer_id));
      where += ` AND ac.offer_id = $${params.length}`;
    }

    if (geo) {
      params.push(geo.toUpperCase());
      where += ` AND ac.geo = $${params.length}`;
    }

    if (carrier) {
      params.push(`%${carrier}%`);
      where += ` AND ac.carrier ILIKE $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      where += ` AND (ac.ip ILIKE $${params.length} OR ac.ua ILIKE $${params.length})`;
    }

    // ---------------------------
    // BASE SELECT (with joins)
    // ---------------------------
    const baseSelect = `
      SELECT
        ac.id,
        ac.pub_id,
        COALESCE(ptl.publisher_name, p.name) AS publisher_name,
        ac.offer_id,
        o.offer_id AS offer_code,
        o.name AS offer_name,
        o.advertiser_name,
        ac.geo,
        ac.carrier,
        ac.ip,
        ac.ua,
        ac.referer,
        ac.params,
        ac.created_at
      FROM analytics_clicks ac
      LEFT JOIN publisher_tracking_links ptl
        ON ptl.pub_code = ac.pub_id
      LEFT JOIN publishers p
        ON p.id = ptl.publisher_id
      LEFT JOIN offers o
        ON o.id = ac.offer_id
      ${where}
    `;

    // ---------------------------
    // CSV EXPORT (no pagination)
    // ---------------------------
    if (format === "csv") {
      const csvSQL = `
        ${baseSelect}
        ORDER BY ac.created_at DESC
        LIMIT 10000
      `;
      const csvRes = await pool.query(csvSQL, params);
      const csvRows = csvRes.rows || [];

      const fields = [
        "created_at",
        "pub_id",
        "publisher_name",
        "offer_code",
        "offer_name",
        "advertiser_name",
        "ip",
        "geo",
        "carrier",
        "params",
        "ua",
      ];

      const parser = new Json2csvParser({ fields });
      const csv = parser.parse(csvRows);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="clicks_${today}.csv"`
      );
      return res.send(csv);
    }

    // ---------------------------
    // MAIN ROWS (with pagination)
    // ---------------------------
    const rowsSQL = `
      ${baseSelect}
      ORDER BY ac.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const rowsRes = await pool.query(rowsSQL, [...params, limit, offset]);
    const rows = rowsRes.rows || [];

    // ---------------------------
    // TOTAL COUNT
    // ---------------------------
    const countSQL = `
      SELECT COUNT(*)::int AS total
      FROM analytics_clicks ac
      ${where}
    `;
    const countRes = await pool.query(countSQL, params);
    const total = countRes.rows[0]?.total || 0;

    // ---------------------------
    // CHART DATA (hour/day group)
    // ---------------------------
    let chart = [];
    if (group === "hour" || group === "day") {
      const bucket = group === "hour" ? "hour" : "day";
      const chartSQL = `
        SELECT
          date_trunc('${bucket}', ac.created_at) AS bucket,
          COUNT(*)::int AS clicks
        FROM analytics_clicks ac
        ${where}
        GROUP BY bucket
        ORDER BY bucket
      `;
      const chartRes = await pool.query(chartSQL, params);
      chart = chartRes.rows || [];
    }

    // ---------------------------
    // RESPONSE
    // ---------------------------
    return res.json({
      rows,
      chart,
      total,
      limit,
      offset,
      from: finalFrom,
      to: finalTo,
    });
  } catch (err) {
    console.error("GET /analytics/clicks ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

export default router;
