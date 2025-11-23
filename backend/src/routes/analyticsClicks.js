// backend/src/routes/analyticsClicks.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";
import { Parser as Json2csvParser } from "json2csv";
import ExcelJS from "exceljs";

const router = express.Router();

// Protected route
router.get("/clicks", authJWT, async (req, res) => {
  try {
    // Query params
    const {
      from,
      to,
      pub_id,
      offer_id,
      geo,
      carrier,
      q, // free text
      group = "none", // none | hour | day
      limit = 200,
      offset = 0,
      format, // csv | xlsx -> export
    } = req.query;

    // Build WHERE + params
    const params = [];
    let where = "WHERE 1=1";

    if (from) {
      params.push(from);
      where += ` AND created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND created_at <= $${params.length}`;
    }

    if (pub_id) {
      // accept numeric id or pub_code string
      if (/^\d+$/.test(String(pub_id))) {
        params.push(Number(pub_id));
        where += ` AND publisher_id = $${params.length}`;
      } else {
        params.push(String(pub_id).toUpperCase());
        where += ` AND (pub_code = $${params.length} OR publisher_id::text = $${params.length})`;
      }
    }

    if (offer_id) {
      if (/^\d+$/.test(String(offer_id))) {
        params.push(Number(offer_id));
        where += ` AND offer_id = $${params.length}`;
      } else {
        params.push(String(offer_id));
        where += ` AND (offer_code = $${params.length} OR offer_id::text = $${params.length})`;
      }
    }

    if (geo) {
      params.push(String(geo).toUpperCase());
      where += ` AND geo = $${params.length}`;
    }

    if (carrier) {
      params.push(String(carrier));
      where += ` AND carrier ILIKE $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      where += ` AND (
        click_id ILIKE $${params.length}
        OR ip_address ILIKE $${params.length}
        OR user_agent ILIKE $${params.length}
        OR CAST(params AS TEXT) ILIKE $${params.length}
      )`;
    }

    // Basic rows (with publisher/offer names if available)
    const rowsSql = `
      SELECT cl.*,
             p.name AS publisher_name,
             o.name AS offer_name
      FROM click_logs cl
      LEFT JOIN publishers p ON p.id = cl.publisher_id
      LEFT JOIN offers o ON o.id = cl.offer_id
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const rowsParams = params.concat([Number(limit), Number(offset)]);
    const rowsRes = await pool.query(rowsSql, rowsParams);
    const rows = rowsRes.rows;

    // Aggregates object
    const agg = {};

    // total count
    const totalSql = `SELECT COUNT(*)::int AS total FROM click_logs ${where}`;
    const totalRes = await pool.query(totalSql, params);
    agg.total = totalRes.rows[0]?.total || 0;

    // by publisher (top)
    const byPubSql = `
      SELECT COALESCE(p.name, cl.pub_code, cl.publisher_id::text) AS pub, COUNT(*)::int AS c
      FROM click_logs cl
      LEFT JOIN publishers p ON p.id = cl.publisher_id
      ${where}
      GROUP BY pub
      ORDER BY c DESC
      LIMIT 20
    `;
    const byPubRes = await pool.query(byPubSql, params);
    agg.byPub = byPubRes.rows;

    // by offer
    const byOfferSql = `
      SELECT COALESCE(o.name, cl.offer_code, cl.offer_id::text) AS offer, COUNT(*)::int AS c
      FROM click_logs cl
      LEFT JOIN offers o ON o.id = cl.offer_id
      ${where}
      GROUP BY offer
      ORDER BY c DESC
      LIMIT 20
    `;
    const byOfferRes = await pool.query(byOfferSql, params);
    agg.byOffer = byOfferRes.rows;

    // by geo
    const byGeoSql = `SELECT COALESCE(geo,'UN') AS geo, COUNT(*)::int AS c FROM click_logs ${where} GROUP BY geo ORDER BY c DESC LIMIT 20`;
    const byGeoRes = await pool.query(byGeoSql, params);
    agg.byGeo = byGeoRes.rows;

    // by carrier
    const byCarrierSql = `SELECT COALESCE(carrier,'-') AS carrier, COUNT(*)::int AS c FROM click_logs ${where} GROUP BY carrier ORDER BY c DESC LIMIT 20`;
    const byCarrierRes = await pool.query(byCarrierSql, params);
    agg.byCarrier = byCarrierRes.rows;

    // hourly or daily groups if requested
    if (group === "hour") {
      const hourlySql = `SELECT date_trunc('hour', created_at) AS period, COUNT(*)::int AS c
                         FROM click_logs ${where}
                         GROUP BY period
                         ORDER BY period`;
      const hourlyRes = await pool.query(hourlySql, params);
      agg.hourly = hourlyRes.rows.map(r => ({ period: r.period, count: r.c }));
    } else if (group === "day") {
      const dailySql = `SELECT date_trunc('day', created_at) AS period, COUNT(*)::int AS c
                         FROM click_logs ${where}
                         GROUP BY period
                         ORDER BY period`;
      const dailyRes = await pool.query(dailySql, params);
      agg.daily = dailyRes.rows.map(r => ({ period: r.period, count: r.c }));
    }

    // EXPORT (CSV / XLSX) - return file if requested
    if (format === "xlsx" || format === "csv") {
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

    // Default JSON response
    res.json({
      rows,
      aggregates: agg,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (err) {
    console.error("GET /analytics/clicks error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
