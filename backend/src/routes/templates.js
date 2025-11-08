import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* 🟢 Get all templates */
router.get("/", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM offer_templates ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /templates error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* 🟢 Get single template */
router.get("/:id", authJWT, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM offer_templates WHERE id=$1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Template not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 🟡 Create new template */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      template_name,
      country_code,
      carrier,
      pin_send_url,
      pin_verify_url,
      status_check_url,
      portal_url,
      parameters,
      description,
    } = req.body;

    if (!template_name) return res.status(400).json({ error: "Template name required" });

    const q = await pool.query(
      `INSERT INTO offer_templates 
       (template_name, country_code, carrier, pin_send_url, pin_verify_url, status_check_url, portal_url, parameters, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        template_name,
        country_code,
        carrier,
        pin_send_url,
        pin_verify_url,
        status_check_url,
        portal_url,
        parameters ? JSON.stringify(parameters) : null,
        description,
      ]
    );
    res.status(201).json(q.rows[0]);
  } catch (err) {
    console.error("POST /templates error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* 🟣 Update template */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const {
      template_name,
      country_code,
      carrier,
      pin_send_url,
      pin_verify_url,
      status_check_url,
      portal_url,
      parameters,
      description,
    } = req.body;

    const q = await pool.query(
      `UPDATE offer_templates 
       SET template_name=$1, country_code=$2, carrier=$3,
           pin_send_url=$4, pin_verify_url=$5, status_check_url=$6, portal_url=$7,
           parameters=$8, description=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [
        template_name,
        country_code,
        carrier,
        pin_send_url,
        pin_verify_url,
        status_check_url,
        portal_url,
        parameters ? JSON.stringify(parameters) : null,
        description,
        req.params.id,
      ]
    );

    if (q.rows.length === 0) return res.status(404).json({ error: "Template not found" });
    res.json(q.rows[0]);
  } catch (err) {
    console.error("PUT /templates/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* 🔴 Delete template */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    await pool.query("DELETE FROM offer_templates WHERE id=$1", [req.params.id]);
    res.json({ message: "Template deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
