import { Router } from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

/* ================= GET ALL ================= */
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, a.name AS advertiser_name
      FROM offers o
      JOIN advertisers a ON a.id = o.advertiser_id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Fetch failed" });
  }
});

/* ================= CREATE ================= */
router.post("/", async (req, res) => {
  try {
    const {
      advertiser_id,
      name,
      geo,
      carrier,
      payout,
      revenue,
      cap,
      redirect_url,
      api_steps,
      is_active = true,
    } = req.body;

    const { rows } = await pool.query(
      `
      INSERT INTO offers (
        advertiser_id, name, geo, carrier,
        payout, revenue, cap,
        redirect_url, api_steps, is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        advertiser_id,
        name,
        geo,
        carrier,
        payout,
        revenue,
        cap,
        redirect_url || null,
        JSON.stringify(api_steps || {}),
        is_active,
      ]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error("CREATE OFFER ERROR:", e);
    res.status(500).json({ message: "Create failed" });
  }
});

/* ================= UPDATE ================= */
router.put("/:id", async (req, res) => {
  try {
    const {
      advertiser_id,
      name,
      geo,
      carrier,
      payout,
      revenue,
      cap,
      redirect_url,
      api_steps,
      is_active,
    } = req.body;

    const { rows } = await pool.query(
      `
      UPDATE offers SET
        advertiser_id=$1,
        name=$2,
        geo=$3,
        carrier=$4,
        payout=$5,
        revenue=$6,
        cap=$7,
        redirect_url=$8,
        api_steps=$9,
        is_active=$10,
        updated_at=NOW()
      WHERE id=$11
      RETURNING *
      `,
      [
        advertiser_id,
        name,
        geo,
        carrier,
        payout,
        revenue,
        cap,
        redirect_url || null,
        JSON.stringify(api_steps || {}),
        is_active,
        req.params.id,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("UPDATE OFFER ERROR:", e);
    res.status(500).json({ message: "Update failed" });
  }
});

/* ================= TOGGLE ================= */
router.patch("/:id/status", async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE offers SET is_active = NOT is_active WHERE id=$1 RETURNING *`,
    [req.params.id]
  );
  res.json(rows[0]);
});

/* ================= DELETE ================= */
router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM offers WHERE id=$1", [req.params.id]);
  res.json({ success: true });
});

export default router;
