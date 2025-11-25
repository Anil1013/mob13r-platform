// backend/src/routes/analyticsClicks.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";
import { Parser as Json2csvParser } from "json2csv";
import ExcelJS from "exceljs";

const router = express.Router();

// ==========================
// CLICK ANALYTICS API
// ==========================
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
      ip,
      click_id,
      ua,
      fraud_flag,
      group = "none",
      limit = 200,
      offset = 0,
      format
    } = req.query;

    // ------------------------------------------
    // SMART DATE DEFAULTS
    // ------------------------------------------
    const today = new Date().toISOString().slice(0, 10);

    if (!from && !to) {
      from = today;
      to = today;
    } else if (from && !to) {
      to = from;
    } else if (!from && to) {
      from = to;
    }

    const params = [];
    let where = "WHERE 1=1";

    // DATE RANGE
    if (from) {
      params.push(from);
      where += ` AND ac.created_at >= $${params.length}::date`;
    }

    if (to) {
      params.push(to);
      where += ` AND ac.created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    // BASIC FILTERS
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

    // ADVANCED FILTERS
    if (ip) {
      params.push(`%${ip}%`);
      where += ` AND ac.ip ILIKE $${params.length}`;
    }

    if (click_id) {
      params.push(`%${click_id}%`);
      where += ` AND ac.params::text ILIKE $${params.length}`;
    }

    if (ua) {
      params.push(`%${ua}%`);
      where += ` AND ac.ua ILIKE $${params.length}`;
    }

    if (fraud_flag === "true" || fraud_flag === "false") {
      params.push(fraud_flag === "true");
      where += ` AND ac.fraud_flag = $${params.length}`;
    }

    // SEARCH
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (
        ac.ip ILIKE $${params.length} OR 
        ac.ua ILIKE $${params.length} OR
        ac.params::text ILIKE $${params.length}
      )`;
    }

    // ======================================================
    // EXPORT (CSV / XLSX)
    // ======================================================
    if (format === "csv" || format === "xlsx") {
      const exportSQL = `
        SELECT ac.*
        FROM analytics_clicks ac
        ${where}
        ORDER BY ac.created_at DESC
        LIMIT 50000
      `;

      const expRes = await pool.query(exportSQL, params);
      const data = expRes.rows.map(row => ({
        ...row,
        params: JSON.stringify(row.params || {})
      }));

      // XLSX
      if (format === "xlsx") {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Clicks");

        ws.columns = Object.keys(data[0] || {}).map(k => ({
          header: k,
          key: k,
          width: 20
        }));

        data.forEach(r => ws.addRow(r));

        res.setHeader("Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", "attachment; filename=clicks.xlsx");

        await wb.xlsx.write(res);
        return res.end();
      }

      // CSV
      const fields = Object.keys(data[0] || {});
      const parser = new Json2csvParser({ fields });
      const csv = parser.parse(data);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=clicks.csv");

      return res.send(csv);
    }

    // ======================================================
    // PAGINATED RESULTS
    // ======================================================
    const rowsSQL = `
      SELECT ac.*
      FROM analytics_clicks ac
      ${where}
      ORDER BY ac.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const rowsRes = await pool.query(rowsSQL, [...params, limit, offset]);

    const countSQL = `
      SELECT COUNT(*)::int AS total
      FROM analytics_clicks ac
      ${where}
    `;

    const totalRes = await pool.query(countSQL, params);

    res.json({
      rows: rowsRes.rows,
      total: totalRes.rows[0].total,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (err) {
    console.error("GET /analytics/clicks ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
