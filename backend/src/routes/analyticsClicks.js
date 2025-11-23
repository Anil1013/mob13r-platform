// backend/src/routes/analyticsClicks.js
import express from "express";
import pool from "../db.js";
import { Parser as Json2csvParser } from "json2csv";
import ExcelJS from "exceljs";

const router = express.Router();

/*
 GET /analytics/clicks
 Query params:
   from, to (ISO date)
   pub_id (publisher_id or pub_code)
   offer_id
   geo
   carrier
   group=hour|day|none
   limit, offset
   format=csv|xlsx  (optional - triggers download)
*/

function buildFilters(q) {
  const params = [];
  let where = "WHERE 1=1";

  if (q.from) {
    params.push(q.from);
    where += ` AND created_at >= $${params.length}`;
  }
  if (q.to) {
    params.push(q.to);
    where += ` AND created_at <= $${params.length}`;
  }

  if (q.pub_id) {
    // allow numeric id or code
    if (/^\d+$/.test(q.pub_id)) {
      params.push(Number(q.pub_id));
      where += ` AND publisher_id = $${params.length}`;
    } else {
      params.push(q.pub_id.toUpperCase());
      where += ` AND (pub_code = $${params.length} OR publisher_id::text = $${params.length})`;
    }
  }

  if (q.offer_id) {
    if (/^\d+$/.test(q.offer_id)) {
      params.push(Number(q.offer_id));
      where += ` AND offer_id = $${params.length}`;
    } else {
      params.push(q.offer_id);
      where += ` AND (offer_code = $${params.length} OR offer_id::text = $${params.length})`;
    }
  }

  if (q.geo) {
    params.push(q.geo.toUpperCase());
    where += ` AND geo = $${params.length}`;
  }

  if (q.carrier) {
    params.push(q.carrier);
    where += ` AND carrier ILIKE $${params.length}`;
  }

  if (q.q) {
    params.push(`%${q.q}%`);
    where += ` AND (
      click_id ILIKE $${params.length}
      OR ip_address ILIKE $${params.length}
      OR user_agent ILIKE $${params.length}
      OR CAST(params AS TEXT) ILIKE $${params.length}
    )`;
  }

  return { where, params };
}

router.get("/clicks", async (req, res) => {
  try {
    const {
      format,
      group = "none",
      limit = 200,
      offset = 0,
    } = req.query;

    const { where, params } = buildFilters(req.query);

    // Base rows (with publisher/offer names if available)
    const rowsSql = `
      SELECT cl.*,
             p.name as publisher_name,
             o.name as offer_name
      FROM click_logs cl
      LEFT JOIN publishers p ON p.id = cl.publisher_id
      LEFT JOIN offers o ON o.id = cl.offer_id
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const rowsParams = params.concat([Number(limit), Number(offset)]);
    const { rows } = await pool.query(rowsSql, rowsParams);

    // Aggregates: total, by_pub, by_offer, hourly (if requested)
    const agg = {};

    const totalSql = `SELECT COUNT(*)::int AS total FROM click_logs ${where}`;
    const total = await pool.query(totalSql, params);
    agg.total = total.rows[0].total || 0;

    const byPubSql = `
      SELECT COALESCE(p.name, cl.pub_code, cl.publisher_id::text) AS pub, COUNT(*)::int AS c
      FROM click_logs cl
      LEFT JOIN publishers p ON p.id = cl.publisher_id
      ${where}
      GROUP BY pub
      ORDER BY c DESC
      LIMIT 20
    `;
    const byPub = await pool.query(byPubSql, params);
    agg.byPub = byPub.rows;

    const byOfferSql = `
      SELECT COALESCE(o.name, cl.offer_code, cl.offer_id::text) AS offer, COUNT(*)::int AS c
      FROM click_logs cl
      LEFT JOIN offers o ON o.id = cl.offer_id
      ${where}
      GROUP BY offer
      ORDER BY c DESC
      LIMIT 20
    `;
    const byOffer = await pool.query(byOfferSql, params);
    agg.byOffer = byOffer.rows;

    // geo/carrier top
    const byGeoSql = `SELECT COALESCE(geo,'UN') AS geo, COUNT(*)::int AS c FROM click_logs ${where} GROUP BY geo ORDER BY c DESC LIMIT 20`;
    const byGeo = await pool.query(byGeoSql, params); agg.byGeo = byGeo.rows;

    const byCarrierSql = `SELECT COALESCE(carrier,'-') AS carrier, COUNT(*)::int AS c FROM click_logs ${where} GROUP BY carrier ORDER BY c DESC LIMIT 20`;
    const byCarrier = await pool.query(byCarrierSql, params); agg.byCarrier = byCarrier.rows;

    // hourly aggregation if requested
    if (group === "hour") {
      const hourlySql = `SELECT date_trunc('hour', created_at) AS period, COUNT(*)::int AS c
                         FROM click_logs ${where}
                         GROUP BY period
                         ORDER BY period`;
      const hourly = await pool.query(hourlySql, params);
      agg.hourly = hourly.rows;
    } else if (group === "day") {
      const dailySql = `SELECT date_trunc('day', created_at) AS period, COUNT(*)::int AS c
                         FROM click_logs ${where}
                         GROUP BY period
                         ORDER BY period`;
      const daily = await pool.query(dailySql, params);
      agg.daily = daily.rows;
    }

    // If client requested CSV/XLSX export, stream/return file
    if (format === "xlsx" || format === "csv") {
      // build export rows (same selection but increase limit)
      const exportSql = `
        SELECT cl.id, cl.publisher_id, cl.pub_code, cl.offer_id, cl.offer_code, cl.click_id,
               cl.ip_address, cl.user_agent, cl.geo, cl.carrier, cl.params, cl.created_at,
               p.name AS publisher_name, o.name AS offer_name
        FROM click_logs cl
        LEFT JOIN publishers p ON p.id = cl.publisher_id
        LEFT JOIN offers o ON o.id = cl.offer_id
        ${where}
        ORDER BY created_at DESC
        LIMIT 5000
      `;
      const exportRes = await pool.query(exportSql, params);
      const exportRows = exportRes.rows.map(r => ({ ...r, params: JSON.stringify(r.params || {}) }));

      if (format === "xlsx") {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("clicks");
        ws.columns = [
          { header: "id", key: "id", width: 8 },
          { header: "publisher_id", key: "publisher_id", width: 12 },
          { header: "publisher_name", key: "publisher_name", width: 24 },
          { header: "pub_code", key: "pub_code", width: 12 },
          { header: "offer_id", key: "offer_id", width: 12 },
          { header: "offer_name", key: "offer_name", width: 24 },
          { header: "offer_code", key: "offer_code", width: 16 },
          { header: "click_id", key: "click_id", width: 24 },
          { header: "ip_address", key: "ip_address", width: 16 },
          { header: "user_agent", key: "user_agent", width: 80 },
          { header: "geo", key: "geo", width: 8 },
          { header: "carrier", key: "carrier", width: 16 },
          { header: "params", key: "params", width: 50 },
          { header: "created_at", key: "created_at", width: 24 },
        ];
        exportRows.forEach(r => ws.addRow(r));
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="clicks_export.xlsx"`);
        await wb.xlsx.write(res);
        return res.end();
      } else {
        const fields = [
          "id","publisher_id","publisher_name","pub_code","offer_id","offer_name","offer_code",
          "click_id","ip_address","user_agent","geo","carrier","params","created_at"
        ];
        const parser = new Json2csvParser({ fields });
        const csv = parser.parse(exportRows);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="clicks_export.csv"`);
        return res.send(csv);
      }
    }

    // default JSON response
    res.json({
      rows,
      aggregates: agg
    });
  } catch (err) {
    console.error("GET /analytics/clicks error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
