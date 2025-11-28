// backend/src/routes/fraud.js
import express from "express";
import pool from "../db.js";
import { Parser as Json2csvParser } from "json2csv";
import ExcelJS from "exceljs";

const router = express.Router();

/* ======================================================
   GET /fraud/alerts  (Search + Filters + Pagination)
   Supports:
   - pub_id
   - q
   - severity
   - geo
   - from: YYYY-MM-DD
   - to: YYYY-MM-DD
   - limit
   - offset
====================================================== */
router.get("/alerts", async (req, res) => {
  try {
    const {
      pub_id,
      q,
      severity,
      geo,
      from,
      to,
      limit = 500,
      offset = 0,
    } = req.query;

    const params = [];
    let where = "WHERE 1=1";

    if (pub_id) {
      params.push(pub_id.toUpperCase());
      where += ` AND pub_id = $${params.length}`;
    }

    if (severity) {
      params.push(severity);
      where += ` AND LOWER(severity) = LOWER($${params.length})`;
    }

    if (geo) {
      params.push(geo.toUpperCase());
      where += ` AND geo = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      where += ` AND (
        ip ILIKE $${idx}
        OR ua ILIKE $${idx}
        OR geo ILIKE $${idx}
        OR carrier ILIKE $${idx}
        OR reason ILIKE $${idx}
        OR severity ILIKE $${idx}
        OR CAST(meta AS TEXT) ILIKE $${idx}
      )`;
    }

    if (from) {
      params.push(from);
      where += ` AND created_at >= $${params.length}::date`;
    }

    if (to) {
      params.push(to);
      where += ` AND created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    // CORRECT LIMIT & OFFSET PARAMS
    const limitIndex = params.push(Number(limit));
    const offsetIndex = params.push(Number(offset));

    const sql = `
      SELECT id, pub_id, ip, ua, geo, carrier, reason, severity,
             resolved, resolved_by, meta, created_at, resolved_at
      FROM fraud_alerts
      ${where}
      ORDER BY created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("FraudAlerts GET error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ======================================================
   POST /fraud/alerts/:id/resolve
====================================================== */
router.post("/alerts/:id/resolve", async (req, res) => {
  try {
    const id = req.params.id;
    const user = req.body.resolved_by || "system";

    const q = `
      UPDATE fraud_alerts
      SET resolved = true,
          resolved_by = $1,
          resolved_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pool.query(q, [user, id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("Resolve alert error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ======================================================
   POST /fraud/whitelist  (Upsert)
====================================================== */
router.post("/whitelist", async (req, res) => {
  try {
    const { pub_id, note, created_by = null } = req.body;

    if (!pub_id) return res.status(400).json({ error: "pub_id_required" });

    const sql = `
      INSERT INTO fraud_whitelist (pub_id, note, created_by, created_at)
      VALUES ($1,$2,$3,NOW())
      ON CONFLICT (pub_id)
      DO UPDATE SET note = EXCLUDED.note
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [
      pub_id.toUpperCase(),
      note || null,
      created_by,
    ]);

    res.json(rows[0]);
  } catch (err) {
    console.error("Whitelist Error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ======================================================
   POST /fraud/blacklist  (Upsert)
====================================================== */
router.post("/blacklist", async (req, res) => {
  try {
    const { ip, note, created_by = null } = req.body;

    if (!ip) return res.status(400).json({ error: "ip_required" });

    const sql = `
      INSERT INTO fraud_blacklist (ip, note, created_by, created_at)
      VALUES ($1,$2,$3,NOW())
      ON CONFLICT (ip)
      DO UPDATE SET note = EXCLUDED.note
      RETURNING *
    `;

    const { rows } = await pool.query(sql, [ip, note || null, created_by]);
    res.json(rows[0]);
  } catch (err) {
    console.error("Blacklist Error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ======================================================
   GET /fraud/export  (CSV / XLSX download)
====================================================== */
router.get("/export", async (req, res) => {
  try {
    const {
      pub_id,
      format = "csv",
      q,
      severity,
      geo,
      from,
      to,
    } = req.query;

    const params = [];
    let where = "WHERE 1=1";

    if (pub_id) {
      params.push(pub_id.toUpperCase());
      where += ` AND pub_id = $${params.length}`;
    }

    if (severity) {
      params.push(severity);
      where += ` AND LOWER(severity) = LOWER($${params.length})`;
    }

    if (geo) {
      params.push(geo.toUpperCase());
      where += ` AND geo = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      where += ` AND (
        ip ILIKE $${idx}
        OR ua ILIKE $${idx}
        OR geo ILIKE $${idx}
        OR carrier ILIKE $${idx}
        OR reason ILIKE $${idx}
        OR severity ILIKE $${idx}
        OR CAST(meta AS TEXT) ILIKE $${idx}
      )`;
    }

    if (from) {
      params.push(from);
      where += ` AND created_at >= $${params.length}::date`;
    }

    if (to) {
      params.push(to);
      where += ` AND created_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    const sql = `
      SELECT id, pub_id, ip, ua, geo, carrier, reason, severity,
             resolved, resolved_by, meta, created_at, resolved_at
      FROM fraud_alerts
      ${where}
      ORDER BY created_at DESC
      LIMIT 5000
    `;

    const { rows } = await pool.query(sql, params);

    /* ---------- EXCEL EXPORT ---------- */
    if (format === "xlsx") {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("fraud_alerts");

      ws.columns = [
        { header: "id", key: "id", width: 8 },
        { header: "pub_id", key: "pub_id", width: 12 },
        { header: "ip", key: "ip", width: 18 },
        { header: "ua", key: "ua", width: 60 },
        { header: "geo", key: "geo", width: 8 },
        { header: "carrier", key: "carrier", width: 18 },
        { header: "reason", key: "reason", width: 20 },
        { header: "severity", key: "severity", width: 10 },
        { header: "resolved", key: "resolved", width: 10 },
        { header: "resolved_by", key: "resolved_by", width: 20 },
        { header: "meta", key: "meta", width: 40 },
        { header: "created_at", key: "created_at", width: 24 },
        { header: "resolved_at", key: "resolved_at", width: 24 },
      ];

      rows.forEach((r) =>
        ws.addRow({
          ...r,
          meta: JSON.stringify(r.meta || {}),
        })
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="fraud_alerts_${pub_id || "all"}.xlsx"`
      );

      await wb.xlsx.write(res);
      return res.end();
    }

    /* ---------- CSV EXPORT ---------- */
    const parser = new Json2csvParser({
      fields: [
        "id",
        "pub_id",
        "ip",
        "ua",
        "geo",
        "carrier",
        "reason",
        "severity",
        "resolved",
        "resolved_by",
        "meta",
        "created_at",
        "resolved_at",
      ],
    });

    const data = rows.map((r) => ({
      ...r,
      meta: JSON.stringify(r.meta || {}),
    }));

    const csv = parser.parse(data);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fraud_alerts_${pub_id || "all"}.csv"`
    );

    res.send(csv);
  } catch (err) {
    console.error("export error:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
