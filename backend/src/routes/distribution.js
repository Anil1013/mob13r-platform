import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   🟢 GET DISTRIBUTION RULES FOR A TRACKING LINK
   ====================================================== */
router.get("/", authJWT, async (req, res) => {
  try {
    const { tracking_link_id } = req.query;

    if (!tracking_link_id) {
      return res.status(400).json({ error: "tracking_link_id is required" });
    }

    const query = `
      SELECT pod.*, o.name AS offer_name
      FROM publisher_offer_distribution pod
      LEFT JOIN offers o ON o.offer_id = pod.offer_id
      WHERE pod.tracking_link_id = $1
      ORDER BY pod.is_fallback ASC, pod.id ASC
    `;

    const { rows } = await pool.query(query, [tracking_link_id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟢 GET REMAINING PERCENTAGE
   ====================================================== */
router.get("/remaining", authJWT, async (req, res) => {
  try {
    const { tracking_link_id } = req.query;

    if (!tracking_link_id) {
      return res.status(400).json({ error: "tracking_link_id is required" });
    }

    const query = `
      SELECT (100 - COALESCE(SUM(percentage), 0)) AS remaining
      FROM publisher_offer_distribution
      WHERE tracking_link_id = $1
        AND is_fallback = FALSE
        AND status = 'active'
    `;

    const { rows } = await pool.query(query, [tracking_link_id]);

    res.json({ remainingPercentage: rows[0]?.remaining || 100 });
  } catch (err) {
    console.error("GET /api/distribution/remaining error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟡 CREATE NEW DISTRIBUTION RULE
   ====================================================== */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      percentage,
      is_fallback,
      daily_cap,
      hourly_cap,
    } = req.body;

    if (!tracking_link_id || !offer_id || !geo || !carrier) {
      return res.status(400).json({
        error: "tracking_link_id, offer_id, geo, carrier are required.",
      });
    }

    // Check remaining % if not fallback
    if (!is_fallback) {
      const remQuery = `
        SELECT (100 - COALESCE(SUM(percentage), 0)) AS remaining
        FROM publisher_offer_distribution
        WHERE tracking_link_id = $1 
          AND is_fallback = FALSE 
          AND status = 'active'
      `;

      const remaining = await pool.query(remQuery, [tracking_link_id]);
      const remain = Number(remaining.rows[0]?.remaining || 100);

      if (percentage > remain) {
        return res.status(400).json({
          error: `Only ${remain}% remaining. Reduce percentage.`,
        });
      }
    }

    const insertQuery = `
      INSERT INTO publisher_offer_distribution
      (tracking_link_id, offer_id, geo, carrier, percentage,
       is_fallback, status, daily_cap, hourly_cap, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,NOW(),NOW())
      RETURNING *;
    `;

    const values = [
      tracking_link_id,
      offer_id,
      geo,
      carrier,
      percentage || 0,
      is_fallback || false,
      daily_cap || 0,
      hourly_cap || 0,
    ];

    const { rows } = await pool.query(insertQuery, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/distribution error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🟠 UPDATE DISTRIBUTION RULE
   ====================================================== */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      offer_id,
      geo,
      carrier,
      percentage,
      is_fallback,
      daily_cap,
      hourly_cap,
      status,
    } = req.body;

    const query = `
      UPDATE publisher_offer_distribution
      SET offer_id=$1, geo=$2, carrier=$3, percentage=$4, is_fallback=$5,
          daily_cap=$6, hourly_cap=$7, status=$8, updated_at=NOW()
      WHERE id=$9
      RETURNING *;
    `;

    const values = [
      offer_id,
      geo,
      carrier,
      percentage,
      is_fallback,
      daily_cap,
      hourly_cap,
      status,
      id,
    ];

    const { rows } = await pool.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🔴 DELETE DISTRIBUTION RULE (SOFT DELETE)
   ====================================================== */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE publisher_offer_distribution
      SET status='inactive', updated_at=NOW()
      WHERE id=$1 RETURNING *;
    `;

    const { rows } = await pool.query(query, [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error("DELETE /api/distribution/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
