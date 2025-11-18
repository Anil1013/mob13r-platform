// backend/routes/distribution.js
import express from "express";
import pool from "../db.js"; // your PG pool
const router = express.Router();

/**
 * GET /api/distribution/meta?pub_id=PUB02
 * - pulls unique geos & carriers from tracking_links for the given pub_id
 * - tries to lookup publisher name from publishers table (fallback: from tracking_links)
 * - fetches offers that match those geos/carriers
 */
router.get("/meta", async (req, res) => {
  const { pub_id } = req.query;
  if (!pub_id) return res.status(400).json({ error: "pub_id required" });

  try {
    // 1) Publisher name: try publishers table first
    let publisherName = null;
    try {
      const pRes = await pool.query(
        `SELECT name FROM publishers WHERE pub_id = $1 LIMIT 1`,
        [pub_id]
      );
      if (pRes.rows.length) publisherName = pRes.rows[0].name;
    } catch (e) {
      // ignore lookup failure, fallback below
    }

    // 2) Distinct geos & carriers from tracking_links for this pub_id
    const geoRes = await pool.query(
      `SELECT DISTINCT geo FROM tracking_links WHERE pub_id = $1 AND geo IS NOT NULL AND geo <> ''`,
      [pub_id]
    );
    const carrierRes = await pool.query(
      `SELECT DISTINCT carrier FROM tracking_links WHERE pub_id = $1 AND carrier IS NOT NULL AND carrier <> ''`,
      [pub_id]
    );

    const geos = geoRes.rows.map((r) => r.geo).filter(Boolean);
    const carriers = carrierRes.rows.map((r) => r.carrier).filter(Boolean);

    // 3) If publisherName still null, try to get from tracking_links (if stored there)
    if (!publisherName) {
      const tRes = await pool.query(
        `SELECT DISTINCT publisher_name FROM tracking_links WHERE pub_id = $1 LIMIT 1`,
        [pub_id]
      );
      if (tRes.rows.length) publisherName = tRes.rows[0].publisher_name || null;
    }

    // 4) Fetch offers that match these geos/carriers (OR logic; adjust as needed)
    // If geos/carriers arrays are empty, we'll return an empty offers array.
    let offers = [];
    if (geos.length || carriers.length) {
      // Build dynamic WHERE parts
      const clauses = [];
      const params = [];
      let idx = 1;

      if (geos.length) {
        clauses.push(`(geo = ANY($${idx}::text[]))`);
        params.push(geos);
        idx++;
      }
      if (carriers.length) {
        clauses.push(`(carrier = ANY($${idx}::text[]))`);
        params.push(carriers);
        idx++;
      }

      const where = clauses.length ? `WHERE ${clauses.join(" OR ")}` : "";
      const q = `SELECT id as offer_id, name, geo, carrier FROM offers ${where} ORDER BY id DESC LIMIT 200`;
      const offRes = await pool.query(q, params);
      offers = offRes.rows;
    }

    return res.json({
      publisher_name: publisherName || null,
      pub_id,
      geos,
      carriers,
      offers,
    });
  } catch (err) {
    console.error("distribution.meta error:", err);
    return res.status(500).json({ error: "internal_error", detail: err.message });
  }
});

export default router;
