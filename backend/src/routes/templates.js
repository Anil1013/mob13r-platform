import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================
   GET ALL TEMPLATES
====================== */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM offer_templates ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /templates error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   CREATE NEW TEMPLATE
====================== */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      template_name,
      country_code,
      carrier,
      api_type,
      pin_send_url,
      pin_verify_url,
      status_check_url,
      portal_url,
      parameters,
      description,
    } = req.body;

    if (!template_name) return res.status(400).json({ error: "Template name required" });

    const query = `
      INSERT INTO offer_templates
      (template_name, country_code, carrier, api_type, pin_send_url, pin_verify_url,
       status_check_url, portal_url, parameters, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`;
    const values = [
      template_name,
      country_code,
      carrier,
      api_type || "PIN",
      pin_send_url,
      pin_verify_url,
      status_check_url,
      portal_url,
      parameters ? JSON.stringify(parameters) : null,
      description,
    ];

    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /templates error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   UPDATE TEMPLATE
====================== */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const {
      template_name,
      country_code,
      carrier,
      api_type,
      pin_send_url,
      pin_verify_url,
      status_check_url,
      portal_url,
      parameters,
      description,
    } = req.body;

    const query = `
      UPDATE offer_templates
      SET template_name=$1, country_code=$2, carrier=$3, api_type=$4,
          pin_send_url=$5, pin_verify_url=$6, status_check_url=$7,
          portal_url=$8, parameters=$9, description=$10, updated_at=NOW()
      WHERE id=$11
      RETURNING *`;
    const values = [
      template_name,
      country_code,
      carrier,
      api_type,
      pin_send_url,
      pin_verify_url,
      status_check_url,
      portal_url,
      parameters ? JSON.stringify(parameters) : null,
      description,
      req.params.id,
    ];

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) return res.status(404).json({ error: "Template not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /templates/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   DELETE TEMPLATE
====================== */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM offer_templates WHERE id=$1", [req.params.id]);
    res.json({ message: "Template deleted" });
  } catch (err) {
    console.error("DELETE /templates error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
