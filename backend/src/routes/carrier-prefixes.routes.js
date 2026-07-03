import express from "express";
import pool from "../db.js";

const router = express.Router();

/* GET ALL — with optional filter */
router.get("/carrier-prefixes", async (req, res) => {
  try {
    const { geo, carrier } = req.query;
    let query = `SELECT id, carrier, geo, prefix FROM carrier_prefixes`;
    const params = [];
    const conditions = [];

    if (geo) { params.push(geo.toUpperCase()); conditions.push(`UPPER(geo) = $${params.length}`); }
    if (carrier) { params.push(`%${carrier}%`); conditions.push(`LOWER(carrier) ILIKE $${params.length}`); }

    if (conditions.length) query += ` WHERE ` + conditions.join(" AND ");
    query += ` ORDER BY geo, carrier, prefix`;

    const result = await pool.query(query, params);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ADD NEW PREFIX */
router.post("/carrier-prefixes", async (req, res) => {
  try {
    const { carrier, geo, prefix } = req.body;
    if (!carrier || !geo || !prefix)
      return res.status(400).json({ status: "FAILED", error: "carrier, geo, prefix required" });

    const result = await pool.query(
      `INSERT INTO carrier_prefixes (carrier, geo, prefix)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [carrier.trim(), geo.trim().toUpperCase(), prefix.trim()]
    );

    if (!result.rows.length)
      return res.status(409).json({ status: "FAILED", error: "Prefix already exists" });

    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* DELETE PREFIX */
router.delete("/carrier-prefixes/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM carrier_prefixes WHERE id = $1`, [req.params.id]);
    res.json({ status: "SUCCESS" });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* GET DISTINCT GEOs (for dropdown) */
router.get("/carrier-prefixes-geos", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT geo FROM carrier_prefixes ORDER BY geo`
    );
    res.json({ status: "SUCCESS", data: result.rows.map(r => r.geo) });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

export default router;
