// backend/src/routes/analyticsClicks.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";
import { Parser as Json2csvParser } from "json2csv";

const router = express.Router();

/**
 * CLICK ANALYTICS
 * -------------------------------
 * JSON mode  : default
 * CSV export : ?format=csv  (no pagination, all filtered rows)
 * Supports filters:
 *   from, to (YYYY-MM-DD)
 *   pub_id, offer_id, geo, carrier, q
 *   group = none | hour | day  (for chart series)
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

    // ---- DATE FALLBACKS (if user leaves empty, default to today) ----
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!from && !to) {
      from = todayStr;
      to = todayStr;
    } else if (from && !to) {
      to = from;
    } else if (!from && to) {
      from = to;
    }

    // ---- BASE WHERE + PARAMS ----
    const params = [];
    let where = "WHERE 1=1";

    if (from) {
      params.push(from);
      where += ` AND ac.created_at >= $${params.length}::date`;
    }

    if (to) {
      params.push(to);
      // include full day
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
      where += ` AND (
        ac.ip ILIKE $${params.length}
        OR ac.ua ILIKE $${params.length}
        OR CAST(ac.params AS TEXT) ILIKE $${params.length}
      )`;
    }

    // -------------------------------------------------
    // CSV EXPORT MODE  (no pagination, full dataset)
    // -------------------------------------------------
    if (format === "csv") {
      const exportSQL = `
        SELECT 
          ac.id,
          ac.created_at,
          ac.pub_id,
          p.name AS publisher_name,
          ac.offer_id,
          o.name AS offer_name,
          COALESCE(a.name, o.advertiser_name) AS advertiser_name,
          ac.geo,
          ac.carrier,
          ac.ip,
          ac.ua,
          ac.referer,
          ac.params->>'click_id' AS click_id,
          ac.params
        FROM analytics_clicks ac
        LEFT JOIN publishers p ON ac.pub_id = p.code
        LEFT JOIN offers o ON ac.offer_id = o.id
        LEFT JOIN advertisers a ON o.advertiser_id = a.id
        ${where}
        ORDER BY ac.created_at DESC
        LIMIT 10000
      `;

      const { rows: exportRows } = await pool.query(exportSQL, params);

      const parser = new Json2csvParser({
        fields: [
          "id",
          "created_at",
          "pub_id",
          "publisher_name",
          "offer_id",
          "offer_name",
          "advertiser_name",
          "geo",
          "carrier",
          "ip",
          "click_id",
          "ua",
          "referer",
          "params",
        ],
      });

      const csv = parser.parse(
        exportRows.map((r) => ({
          ...r,
          params: JSON.stringify(r.params || {}),
        }))
      );

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="clicks_${todayStr}.csv"`
      );
      return res.send(csv);
    }

    // -------------------------------------------------
    // NORMAL JSON MODE (with pagination & chart series)
    // -------------------------------------------------

    // Main rows with joins for names
    const rowsSQL = `
      SELECT 
        ac.*,
        p.name AS publisher_name,
        o.name AS offer_name,
        COALESCE(a.name, o.advertiser_name) AS advertiser_name
      FROM analytics_clicks ac
      LEFT JOIN publishers p ON ac.pub_id = p.code
      LEFT JOIN offers o ON ac.offer_id = o.id
      LEFT JOIN advertisers a ON o.advertiser_id = a.id
      ${where}
      ORDER BY ac.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const rowsRes = await pool.query(rowsSQL, [...params, limit, offset]);
    const rows = rowsRes.rows;

    // Total count
    const countSQL = `
      SELECT COUNT(*)::int AS total
      FROM analytics_clicks ac
      LEFT JOIN publishers p ON ac.pub_id = p.code
      LEFT JOIN offers o ON ac.offer_id = o.id
      LEFT JOIN advertisers a ON o.advertiser_id = a.id
      ${where}
    `;
    const totalRes = await pool.query(countSQL, params);
    const total = totalRes.rows[0].total;

    // Optional time-series aggregation
    let series = [];
    if (group === "hour" || group === "day") {
      const bucketExpr =
        group === "hour"
          ? "to_char(date_trunc('hour', ac.created_at), 'YYYY-MM-DD HH24:00')"
          : "to_char(date_trunc('day', ac.created_at), 'YYYY-MM-DD')";

      const seriesSQL = `
        SELECT 
          ${bucketExpr} AS bucket,
          COUNT(*)::int AS clicks
        FROM analytics_clicks ac
        ${where}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
      const seriesRes = await pool.query(seriesSQL, params);
      series = seriesRes.rows;
    }

    return res.json({
      rows,
      total,
      limit: Number(limit),
      offset: Number(offset),
      series,
      meta: {
        from,
        to,
        group,
      },
    });
  } catch (err) {
    console.error("GET /analytics/clicks ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
