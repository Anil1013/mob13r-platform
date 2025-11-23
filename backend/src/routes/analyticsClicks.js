// mob13r-platform/backend/src/routes/analyticsClicks.js

import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";
import ExcelJS from "exceljs";
import { Parser as Json2csvParser } from "json2csv";

const router = express.Router();

/* ============================================================
   ✅ GET CLICK LOGS (Filters + Pagination + Secure JWT)
   Route: GET /analytics/clicks
============================================================ */
router.get("/clicks", authJWT, async (req, res) => {
  try {
    let {
      pub_id,
      offer_id,
      geo,
      carrier,
      from,
      to,
      limit = 1000,
      offset = 0,
    } = req.query;

    limit = Number(limit);
    offset = Number(offset);

    const params = [];
    let where = "WHERE 1=1";

    if (pub_id) {
      params.push(pub_id);
      where += ` AND pub_id = $${params.length}`;
    }
    if (offer_id) {
      params.push(offer_id);
      where += ` AND offer_id = $${params.length}`;
    }
    if (geo) {
      params.push(geo.toUpperCase());
      where += ` AND UPPER(geo) = $${params.length}`;
    }
    if (carrier) {
      params.push(carrier);
      where += ` AND carrier = $${params.length}`;
    }
    if (from) {
      params.push(from);
      where += ` AND created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND created_at <= $${params.length}`;
    }

    params.push(limit);
    params.push(offset);

    const sql = `
      SELECT id, pub_id, offer_id, ip, geo, carrier,
             click_id, ua, created_at
      FROM clicks_log
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /analytics/clicks error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ============================================================
   ✅ EXPORT CLICK LOGS (CSV / XLSX)
   Route: GET /analytics/clicks/export
============================================================ */
router.get("/clicks/export", authJWT, async (req, res) => {
  try {
    let { pub_id, offer_id, geo, carrier, from, to, format = "csv" } =
      req.query;

    const params = [];
    let where = "WHERE 1=1";

    if (pub_id) {
      params.push(pub_id);
      where += ` AND pub_id = $${params.length}`;
    }
    if (offer_id) {
      params.push(offer_id);
      where += ` AND offer_id = $${params.length}`;
    }
    if (geo) {
      params.push(geo.toUpperCase());
      where += ` AND UPPER(geo) = $${params.length}`;
    }
    if (carrier) {
      params.push(carrier);
      where += ` AND carrier = $${params.length}`;
    }
    if (from) {
      params.push(from);
      where += ` AND created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND created_at <= $${params.length}`;
    }

    const sql = `
      SELECT id, pub_id, offer_id, ip, geo, carrier,
             click_id, ua, created_at
      FROM clicks_log
      ${where}
      ORDER BY created_at DESC
      LIMIT 20000
    `;

    const { rows } = await pool.query(sql, params);

    /* --------------------- XLSX EXPORT --------------------- */
    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("clicks");

      ws.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Publisher", key: "pub_id", width: 15 },
        { header: "Offer", key: "offer_id", width: 15 },
        { header: "IP", key: "ip", width: 18 },
        { header: "GEO", key: "geo", width: 8 },
        { header: "Carrier", key: "carrier", width: 14 },
        { header: "Click ID", key: "click_id", width: 18 },
        { header: "User Agent", key: "ua", width: 50 },
        { header: "Created At", key: "created_at", width: 22 },
      ];

      rows.forEach((row) => ws.addRow(row));

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="clicks_export.xlsx"`
      );

      await wb.xlsx.write(res);
      return res.end();
    }

    /* --------------------- CSV EXPORT --------------------- */
    const parser = new Json2csvParser({
      fields: [
        "id",
        "pub_id",
        "offer_id",
        "ip",
        "geo",
        "carrier",
        "click_id",
        "ua",
        "created_at",
      ],
    });

    const csv = parser.parse(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="clicks_export.csv"`
    );

    return res.send(csv);
  } catch (err) {
    console.error("EXPORT clicks error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
