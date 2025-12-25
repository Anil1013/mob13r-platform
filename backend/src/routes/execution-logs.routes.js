import { Router } from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

/* ================= GET LOGS ================= */
router.get("/", async (req, res) => {
  const { offer_id, transaction_id } = req.query;

  let where = [];
  let values = [];

  if (offer_id) {
    values.push(offer_id);
    where.push(`offer_id = $${values.length}`);
  }

  if (transaction_id) {
    values.push(transaction_id);
    where.push(`transaction_id = $${values.length}`);
  }

  const sql = `
    SELECT *
    FROM offer_executions
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(sql, values);
  res.json(rows);
});

/* ================= EXPORT CSV ================= */
router.get("/export", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM offer_executions ORDER BY created_at DESC"
  );

  const csv = [
    "id,offer_id,step,status,transaction_id,created_at",
    ...rows.map(
      (r) =>
        `${r.id},${r.offer_id},${r.step},${r.status},${r.transaction_id},${r.created_at}`
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=offer_execution_logs.csv"
  );

  res.send(csv);
});

export default router;
