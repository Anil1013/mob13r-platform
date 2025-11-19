import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ---------------------------------------------------
   1️⃣  GET META: publisher, geo, carrier, offers
----------------------------------------------------*/
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) {
      return res.status(400).json({ error: "pub_id required" });
    }

    // Pull the tracking config for this PUB_ID
    const meta = await pool.query(
      `SELECT 
          id AS tracking_id,
          publisher_id,
          pub_id,
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
       WHERE pub_id = $1`,
      [pub_id]
    );

    if (meta.rows.length === 0) {
      return res.status(404).json({ error: "PUB_ID not found" });
    }

    const base = meta.rows[0];

    res.json({
      publisher_id: base.publisher_id,
      pub_id: base.pub_id,
      geo: base.geo,
      carrier: base.carrier,
      offers: meta.rows
    });

  } catch (err) {
    console.error("META ERROR", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------------------
   2️⃣  SAVE TRAFFIC RULE
----------------------------------------------------*/
router.post("/", authJWT, async (req, res) => {
  try {
    const { pub_id, publisher_id, tracking_id, weight } = req.body;

    if (!pub_id || !publisher_id || !tracking_id) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Fetch redirect URL from tracking links table
    const offer = await pool.query(
      `SELECT 
          tracking_url, 
          pin_send_url, 
          pin_verify_url, 
          check_status_url, 
          portal_url,
          type
       FROM publisher_tracking_links
       WHERE id = $1`,
      [tracking_id]
    );

    if (offer.rows.length === 0) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Choose redirect URL based on tracking type
    const row = offer.rows[0];
    let redirect = row.tracking_url;

    if (row.type === "INAPP") {
      redirect = row.pin_send_url; // Or any other flow you prefer
    }

    await pool.query(
      `INSERT INTO traffic_rules
       (pub_id, publisher_id, tracking_id, geo, carrier, weight, redirect_url)
       SELECT pub_id, publisher_id, id, geo, carrier, $1, $2
       FROM publisher_tracking_links
       WHERE id = $3`,
      [weight || 100, redirect, tracking_id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("SAVE RULE ERROR", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------------------
   3️⃣  GET RULES LIST
----------------------------------------------------*/
router.get("/", authJWT, async (req, res) => {
  const { pub_id } = req.query;

  try {
    const rules = await pool.query(
      `SELECT R.*, T.name, T.geo, T.carrier
       FROM traffic_rules R
       JOIN publisher_tracking_links T
         ON R.tracking_id = T.id
       WHERE R.pub_id = $1
       ORDER BY R.id DESC`,
      [pub_id]
    );

    res.json(rules.rows);

  } catch (err) {
    console.error("FETCH RULES ERROR", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
