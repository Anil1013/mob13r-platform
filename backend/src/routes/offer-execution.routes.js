import express from "express";
import auth from "../middleware/auth.js";
import db from "../db.js";

const router = express.Router();

/**
 * EXECUTION LOGS ROUTES
 * TABLE: offer_execution_logs
 */

/* =====================================================
   GET EXECUTION LOGS (JSON)
===================================================== */
router.get("/", auth, async (req, res) => {
  try {
    const { offer_id } = req.query;

    const conditions = [];
    const values = [];

    if (offer_id) {
      values.push(offer_id);
      conditions.push(`offer_id = $${values.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await db.query(
      `
      SELECT
        id,
        offer_id,
        step,
        status,
        request_payload,
        response_payload,
        error,
        created_at
      FROM offer_execution_logs
      ${where}
      ORDER BY id DESC
      LIMIT 500
      `,
      values
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /execution-logs error:", err);
    res.status(500).json({ error: "Failed to fetch execution logs" });
  }
});

/* =====================================================
   EXPORT EXECUTION LOGS (CSV)
===================================================== */
router.get("/export", auth, async (req, res) => {
  try {
    const { offer_id } = req.query;

    const conditions = [];
    const values = [];

    if (offer_id) {
      values.push(offer_id);
      conditions.push(`offer_id = $${values.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await db.query(
      `
      SELECT
        id,
        offer_id,
        step,
        status,
        request_payload,
        response_payload,
        error,
        created_at
      FROM offer_execution_logs
      ${where}
      ORDER BY id DESC
      LIMIT 5000
      `,
      values
    );

    const headers = [
      "id",
      "offer_id",
      "step",
      "status",
      "created_at",
      "request_payload",
      "response_payload",
      "error",
    ];

    let csv = headers.join(",") + "\n";

    rows.forEach((r) => {
      const line = headers.map((h) => {
        const val = r[h];
        if (val === null || val === undefined) return '""';

        const safe =
          typeof val === "object" ? JSON.stringify(val) : String(val);

        return `"${safe.replace(/"/g, '""')}"`;
      });

      csv += line.join(",") + "\n";
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=offer_execution_logs.csv"
    );

    res.send(csv);
  } catch (err) {
    console.error("EXPORT /execution-logs error:", err);
    res.status(500).json({ error: "Failed to export execution logs" });
  }
});

export default router;
