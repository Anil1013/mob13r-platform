import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

/* GET ALL — public (landing pages need this to build the calling-code dropdown) */
router.get("/geos", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, code, name, calling_code FROM geos ORDER BY name ASC`
    );
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ADD NEW GEO */
router.post("/geos", orgAuth, async (req, res) => {
  try {
    const { code, name, calling_code } = req.body;
    if (!code || !code.trim() || !name || !name.trim())
      return res.status(400).json({ status: "FAILED", error: "code and name required" });
    if (calling_code && !/^\+\d{1,4}$/.test(calling_code.trim()))
      return res.status(400).json({ status: "FAILED", error: "calling_code must look like +964" });

    const result = await pool.query(
      `INSERT INTO geos (code, name, calling_code) VALUES ($1, $2, $3)
       ON CONFLICT (code) DO NOTHING RETURNING *`,
      [code.trim().toUpperCase(), name.trim(), calling_code?.trim() || null]
    );
    if (!result.rows.length)
      return res.status(409).json({ status: "FAILED", error: "This geo code already exists" });

    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* UPDATE GEO */
router.patch("/geos/:id", orgAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, calling_code } = req.body;
    if (calling_code && !/^\+\d{1,4}$/.test(calling_code.trim()))
      return res.status(400).json({ status: "FAILED", error: "calling_code must look like +964" });

    const result = await pool.query(
      `UPDATE geos SET name = COALESCE($1, name), calling_code = $2 WHERE id = $3 RETURNING *`,
      [name?.trim() || null, calling_code?.trim() || null, id]
    );
    if (!result.rows.length) return res.status(404).json({ status: "FAILED", error: "Geo not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* DELETE GEO */
router.delete("/geos/:id", orgAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM geos WHERE id = $1`, [req.params.id]);
    res.json({ status: "SUCCESS" });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

export default router;
