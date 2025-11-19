import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* -----------------------------------------------------
   GET META DATA FOR PUB_ID
   Returns:
   - pub_id
   - publisher_id
   - geo, carrier
   - offers (from publisher_tracking_links)
----------------------------------------------------- */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const pubId = req.query.pub_id?.toUpperCase();
    if (!pubId) {
      return res.status(400).json({ error: "pub_id_missing" });
    }

    // 1) Fetch tracking link by PUB_ID (Correct table)
    const track = await pool.query(
      `SELECT 
          id AS tracking_id,
          publisher_id,
          pub_code,
          name,
          geo,
          carrier,
          type,
          payout,
          landing_page_url,
          tracking_url,
          pin_send_url,
          pin_verify_url,
          check_status_url,
          portal_url
        FROM publisher_tracking_links
        WHERE pub_code = $1`,
      [pubId]
    );

    if (track.rows.length === 0) {
      return res.status(404).json({ error: "pub_id_not_found" });
    }

    const row = track.rows[0];

    // 2) Fetch all offers for same publisher + geo + carrier
    const offers = await pool.query(
      `SELECT 
          id AS tracking_id,
          name,
          geo,
          carrier,
          type,
          payout,
          tracking_url,
          pin_send_url,
          pin_verify_url,
          check_status_url,
          portal_url,
          landing_page_url
        FROM publisher_tracking_links
        WHERE publisher_id = $1
          AND geo = $2
          AND carrier = $3
        ORDER BY id DESC`,
      [row.publisher_id, row.geo, row.carrier]
    );

    return res.json({
      pub_id: pubId,
      publisher_id: row.publisher_id,
      geo: row.geo,
      carrier: row.carrier,
      offers: offers.rows
    });

  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});


/* -----------------------------------------------------
   GET RULES FOR PUB_ID
----------------------------------------------------- */
router.get("/", authJWT, async (req, res) => {
  try {
    const pubId = req.query.pub_id?.toUpperCase();
    if (!pubId) return res.status(400).json({ error: "pub_id_missing" });

    const r = await pool.query(
      `SELECT 
          tr.id,
          tr.pub_id,
          tr.weight,
          tr.redirect_url,
          ptl.name,
          ptl.geo,
          ptl.carrier
        FROM traffic_rules tr
        JOIN publisher_tracking_links ptl
          ON tr.offer_tracking_id = ptl.id
        WHERE tr.pub_id = $1
        ORDER BY tr.id DESC`,
      [pubId]
    );

    res.json(r.rows);

  } catch (err) {
    console.error("RULE FETCH ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});


/* -----------------------------------------------------
   ADD NEW RULE
----------------------------------------------------- */
router.post("/", authJWT, async (req, res) => {
  try {
    const { pub_id, publisher_id, tracking_id, weight } = req.body;

    if (!pub_id || !publisher_id || !tracking_id) {
      return res.status(400).json({ error: "missing_fields" });
    }

    // Fetch redirect URL from tracking table
    const tr = await pool.query(
      `SELECT
          tracking_url,
          pin_send_url,
          pin_verify_url,
          portal_url,
          landing_page_url,
          type
        FROM publisher_tracking_links
        WHERE id = $1`,
      [tracking_id]
    );

    const t = tr.rows[0];

    let redirectUrl =
      t.type === "INAPP"
        ? t.portal_url
        : t.tracking_url;

    await pool.query(
      `INSERT INTO traffic_rules
        (pub_id, publisher_id, offer_tracking_id, weight, redirect_url)
        VALUES ($1, $2, $3, $4, $5)`,
      [pub_id, publisher_id, tracking_id, weight, redirectUrl]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("ADD RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
