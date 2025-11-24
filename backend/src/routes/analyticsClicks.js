// backend/src/routes/analyticsClicks.js
import express from "express";
import pool from "../db.js"; // your existing pg pool
import { Parser as Json2CsvParser } from "json2csv";

const router = express.Router();

/**
 * GET /api/analytics/clicks
 *
 * Query params:
 *  - pub_id (pub code or publisher id)
 *  - offer_id (offer id)
 *  - geo
 *  - carrier
 *  - q (search across ip / ua / click_id / pub_code / offer_code / publisher_name / offer_name)
 *  - from (YYYY-MM-DD)
 *  - to   (YYYY-MM-DD)
 *  - group (none | hour | day)  -> grouping aggregation
 *  - limit (default 200)
 *  - offset (default 0)
 *  - format (json | csv) default json
 *
 * Exports CSV when format=csv
 */

function parseIntSafe(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

router.get("/", async (req, res) => {
  try {
    const {
      pub_id,
      offer_id,
      geo,
      carrier,
      q,
      from: fromDate,
      to: toDate,
      group = "none",
      limit = 200,
      offset = 0,
      format = "json",
    } = req.query;

    const lim = Math.min(parseIntSafe(limit, 200), 5000);
    const off = Math.max(parseIntSafe(offset, 0), 0);

    // Base columns: try to select requested fields with safe fallbacks
    const selectCols = [
      `ac.id AS id`,
      `ac.created_at AT TIME ZONE 'UTC' AT TIME ZONE COALESCE($$tz$$, 'UTC') AS time_utc` // placeholder, will replace
    ];

    // We'll build the sql with parameterized values
    const params = [];
    let idx = 1;

    // We don't actually have a timezone parameter from client; keep as UTC
    // We'll replace the $$tz$$ token with 'UTC' literal later.

    // fallback-safe joins: offers o, publishers p, tracking t
    // Use COALESCE for code/name fields to avoid errors if column is named differently
    const extras = [
      `COALESCE(p.pub_code, p.code, p.publisher_code, p.id::text) AS pub_code`,
      `COALESCE(p.publisher_name, p.name, p.org_name) AS publisher_name`,
      `COALESCE(t.id::text, ac.tracking_link_id::text) AS tracking_link_id`,
      `COALESCE(o.offer_code, o.code, o.offer_id::text, o.id::text) AS offer_code`,
      `COALESCE(o.offer_name, o.name) AS offer_name`,
      `COALESCE(o.advertiser_name, o.advertiser) AS advertiser_name`,
      `ac.offer_id::text AS offer_id`,
      `ac.publisher_id::text AS publisher_id`,
      `ac.ip`,
      `ac.click_id`,
      `COALESCE(ac.geo, ac.country, ac.country_code) AS geo`,
      `COALESCE(ac.carrier, ac.network) AS carrier`,
      `ac.ua AS ua`
    ];

    // assemble select
    const select = [
      `ac.id`,
      `ac.created_at`,
      ...extras
    ].join(",\n  ");

    // start building SQL
    let q = `
      SELECT
        ${select}
      FROM analytics_clicks ac
      LEFT JOIN offers o ON o.id::text = ac.offer_id::text
      LEFT JOIN publishers p ON p.id::text = ac.publisher_id::text
      LEFT JOIN publisher_tracking_links t ON t.id::text = ac.tracking_link_id::text
    `;

    // WHERE conditions
    const where = [];

    if (pub_id) {
      // accept either pub_code or publisher id
      params.push(pub_id);
      where.push(`(
        p.pub_code = $${idx}
        OR p.code = $${idx}
        OR p.id::text = $${idx}
        OR ac.publisher_id::text = $${idx}
        OR ac.pub_code = $${idx}
      )`);
      idx++;
    }

    if (offer_id) {
      params.push(offer_id);
      where.push(`(
        o.offer_id = $${idx}
        OR o.offer_code = $${idx}
        OR o.id::text = $${idx}
        OR ac.offer_id::text = $${idx}
      )`);
      idx++;
    }

    if (geo) {
      params.push(geo.toUpperCase());
      where.push(`(UPPER(COALESCE(ac.geo, ac.country, ac.country_code, o.geo)) = $${idx})`);
      idx++;
    }

    if (carrier) {
      params.push(carrier.toUpperCase());
      where.push(`(UPPER(COALESCE(ac.carrier, ac.network, o.carrier)) = $${idx})`);
      idx++;
    }

    if (fromDate) {
      params.push(`${fromDate}T00:00:00Z`);
      where.push(`ac.created_at >= $${idx}`);
      idx++;
    }
    if (toDate) {
      params.push(`${toDate}T23:59:59Z`);
      where.push(`ac.created_at <= $${idx}`);
      idx++;
    }

    if (q) {
      // search across ip/ua/click_id/pub/offer/publisher/offer_name
      const term = `%${q}%`;
      params.push(term, term, term, term, term, term);
      where.push(`(
        ac.ip ILIKE $${idx}
        OR ac.ua ILIKE $${idx + 1}
        OR ac.click_id ILIKE $${idx + 2}
        OR COALESCE(p.pub_code, p.code, p.id::text) ILIKE $${idx + 3}
        OR COALESCE(o.offer_code, o.code, o.id::text) ILIKE $${idx + 4}
        OR COALESCE(o.offer_name, o.name, '') ILIKE $${idx + 5}
      )`);
      idx += 6;
    }

    if (where.length) {
      q += " WHERE " + where.join(" AND ");
    }

    // GROUPING
    const allowedGroups = ["none", "hour", "day"];
    const grp = allowedGroups.includes(group) ? group : "none";

    if (grp === "hour") {
      q = `
        SELECT
          date_trunc('hour', ac.created_at) AS bucket,
          COUNT(*)::int AS clicks,
          MIN(ac.created_at) AS sample_time
        FROM analytics_clicks ac
        LEFT JOIN offers o ON o.id::text = ac.offer_id::text
        LEFT JOIN publishers p ON p.id::text = ac.publisher_id::text
        LEFT JOIN publisher_tracking_links t ON t.id::text = ac.tracking_link_id::text
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        GROUP BY bucket
        ORDER BY bucket DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(lim, off);
    } else if (grp === "day") {
      q = `
        SELECT
          date_trunc('day', ac.created_at) AS bucket,
          COUNT(*)::int AS clicks,
          MIN(ac.created_at) AS sample_time
        FROM analytics_clicks ac
        LEFT JOIN offers o ON o.id::text = ac.offer_id::text
        LEFT JOIN publishers p ON p.id::text = ac.publisher_id::text
        LEFT JOIN publisher_tracking_links t ON t.id::text = ac.tracking_link_id::text
        ${where.length ? "WHERE " + where.join(" AND ") : ""}
        GROUP BY bucket
        ORDER BY bucket DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(lim, off);
    } else {
      // no grouping -> return rows
      q += `
        ORDER BY ac.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      params.push(lim, off);
    }

    // Execute
    const { rows } = await pool.query(q, params);

    // format CSV if requested
    if (format === "csv") {
      // if grouped, rows have bucket / clicks / sample_time
      let fields;
      if (grp === "none") {
        fields = [
          { label: "id", value: "id" },
          { label: "created_at", value: "created_at" },
          { label: "pub_code", value: "pub_code" },
          { label: "publisher_name", value: "publisher_name" },
          { label: "tracking_link_id", value: "tracking_link_id" },
          { label: "offer_id", value: "offer_id" },
          { label: "offer_code", value: "offer_code" },
          { label: "offer_name", value: "offer_name" },
          { label: "advertiser_name", value: "advertiser_name" },
          { label: "ip", value: "ip" },
          { label: "click_id", value: "click_id" },
          { label: "geo", value: "geo" },
          { label: "carrier", value: "carrier" },
          { label: "ua", value: "ua" }
        ];
      } else {
        fields = [
          { label: "bucket", value: "bucket" },
          { label: "clicks", value: "clicks" },
          { label: "sample_time", value: "sample_time" }
        ];
      }

      const json2csv = new Json2CsvParser({ fields });
      const csv = json2csv.parse(rows);

      const filename = `clicks-${grp}-${new Date().toISOString().slice(0,10)}.csv`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send(csv);
    }

    // default JSON
    res.json({ rows, count: rows.length, limit: lim, offset: off });
  } catch (err) {
    console.error("GET /analytics/clicks ERROR:", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
});

export default router;
