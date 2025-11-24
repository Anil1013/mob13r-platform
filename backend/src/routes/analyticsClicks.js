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
    const {
      from,
      to,
      pub_id,
      offer_id,
      geo,
      carrier,
      q,                // search
      group = "none",   // hour/day/none
      limit = 200,
      offset = 0,
      format            // csv/xlsx
    } = req.query;

    // ---------------------------
    // BUILD WHERE CLAUSE
    // ---------------------------
    const params = [];
    let where = "WHERE 1=1";

    if (from) {
      params.push(from);
      where += ` AND cl.created_at >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      where += ` AND cl.created_at <= $${params.length}`;
    }

    if (pub_id) {
      // ID or CODE
      if (/^\d+$/.test(pub_id)) {
        params.push(Number(pub_id));
        where += ` AND cl.publisher_id = $${params.length}`;
      } else {
        params.push(pub_id.toUpperCase());
        where += ` AND (cl.pub_code = $${params.length} OR cl.publisher_id::text = $${params.length})`;
      }
    }

    if (offer_id) {
      if (/^\d+$/.test(offer_id)) {
        params.push(Number(offer_id));
        where += ` AND cl.offer_id = $${params.length}`;
      } else {
        params.push(offer_id.toUpperCase());
        where += ` AND (cl.offer_code = $${params.length} OR cl.offer_id::text = $${params.length})`;
      }
    }

    if (geo) {
      params.push(geo.toUpperCase());
      where += ` AND cl.geo = $${params.length}`;
    }

    if (carrier) {
      params.push(`%${carrier}%`);
      where += ` AND cl.carrier ILIKE $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      where += ` AND (
        cl.click_id ILIKE $${params.length} OR
        cl.ip_address ILIKE $${params.length} OR
        cl.user_agent ILIKE $${params.length} OR
        CAST(cl.params AS TEXT) ILIKE $${params.length}
      )`;
    }

    // ---------------------------
    // MAIN ROWS QUERY
    // ---------------------------
    const mainSQL = `
      SELECT 
        cl.*,
        p.name AS publisher_name,
        o.name AS offer_name,
        o.advertiser_name
      FROM click_logs cl
      LEFT JOIN publishers p ON p.id = cl.publisher_id
      LEFT JOIN offers o ON o.id = cl.offer_id
      ${where}
      ORDER BY cl.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const rowsRes = await pool.query(mainSQL, [...params, Number(limit), Number(offset)]);
    const rows = rowsRes.rows;

    // ---------------------------
    // TOTAL COUNT
    // ---------------------------
    const countSQL = `SELECT COUNT(*)::int AS total FROM click_logs cl ${where}`;
    const countRes = await pool.query(countSQL, params);
    const total = countRes.rows[0].total;

    // ---------------------------
    // AGGREGATES
    // ---------------------------
    const agg = {};

    // by publisher
    const byPubSQL = `
      SELECT COALESCE(p.name, cl.pub_code, cl.publisher_id::text) AS publisher,
             COUNT(*)::int AS c
      FROM click_logs cl
      LEFT JOIN publishers p ON p.id = cl.publisher_id
      ${where}
      GROUP BY publisher
      ORDER BY c DESC
      LIMIT 20
    `;
    agg.byPub = (await pool.query(byPubSQL, params)).rows;

    // by offer
    const byOfferSQL = `
      SELECT COALESCE(o.name, cl.offer_code, cl.offer_id::text) AS offer,
             COUNT(*)::int AS c
      FROM click_logs cl
      LEFT JOIN offers o ON o.id = cl.offer_id
      ${where}
      GROUP BY offer
      ORDER BY c DESC
      LIMIT 20
    `;
    agg.byOffer = (await pool.query(byOfferSQL, params)).rows;

    // by geo
    const byGeoSQL = `SELECT COALESCE(geo,'UN') AS geo, COUNT(*)::int AS c 
                      FROM click_logs cl ${where} 
                      GROUP BY geo ORDER BY c DESC LIMIT 20`;
    agg.byGeo = (await pool.query(byGeoSQL, params)).rows;

    // by carrier
    const byCarrierSQL = `SELECT COALESCE(carrier,'-') AS carrier, COUNT(*)::int AS c 
                          FROM click_logs cl ${where} 
                          GROUP BY carrier ORDER BY c DESC LIMIT 20`;
    agg.byCarrier = (await pool.query(byCarrierSQL, params)).rows;

    // ---------------------------
    // GROUPED HOURLY/DAYWISE
    // ---------------------------
    if (group === "hour") {
      const hourlySQL = `
        SELECT date_trunc('hour', cl.created_at) AS period,
               COUNT(*)::int AS c
        FROM click_logs cl
        ${where}
        GROUP BY period
        ORDER BY period ASC
      `;
      agg.hourly = (await pool.query(hourlySQL, params)).rows;
    }

    if (group === "day") {
      const daySQL = `
        SELECT date_trunc('day', cl.created_at) AS period,
               COUNT(*)::int AS c
        FROM click_logs cl
        ${where}
        GROUP BY period
        ORDER BY period ASC
      `;
      agg.daily = (await pool.query(daySQL, params)).rows;
    }

    // ---------------------------
    // EXPORT CSV/XLSX
    // ---------------------------
    if (format === "csv" || format === "xlsx") {
      const exportSQL = `
        SELECT 
          cl.*,
          p.name AS publisher_name,
          o.name AS offer_name,
          o.advertiser_name
        FROM click_logs cl
        LEFT JOIN publishers p ON p.id = cl.publisher_id
        LEFT JOIN offers o ON o.id = cl.offer_id
        ${where}
        ORDER BY cl.created_at DESC
        LIMIT 5000
      `;
      const expRes = await pool.query(exportSQL, params);
      const data = expRes.rows.map(r => ({
        ...r,
        params: JSON.stringify(r.params || {})
      }));

      if (format === "xlsx") {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Clicks Export");

        ws.columns = Object.keys(data[0] || {}).map(key => ({
          header: key,
          key,
          width: 25
        }));

        data.forEach(r => ws.addRow(r));

        res.setHeader("Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", "attachment; filename=clicks.xlsx");

        await wb.xlsx.write(res);
        return res.end();
      }

      if (format === "csv") {
        const fields = Object.keys(data[0] || {});
        const parser = new Json2csvParser({ fields });
        const csv = parser.parse(data);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=clicks.csv");

        return res.send(csv);
      }
    }

    // ---------------------------
    // SUCCESS JSON
    // ---------------------------
    res.json({
      rows,
      total,
      aggregates: agg,
      limit: Number(limit),
      offset: Number(offset)
    });

  } catch (err) {
    console.error("GET /analyticsClicks ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
