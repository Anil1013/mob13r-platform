import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ======================================================
   🔧 HELPER: Resolve INAPP Context
====================================================== */
async function resolveInappContext(pub_code, offer_id) {
  const q = `
    SELECT
      ptl.id       AS tracking_link_id,
      ptl.publisher_id,
      ptl.geo,
      ptl.carrier,
      ptl.payout   AS publisher_payout,
      o.payout     AS offer_payout
    FROM publisher_tracking_links ptl
    JOIN offers o
      ON o.offer_id = $2
    WHERE ptl.pub_code = $1
      AND ptl.type = 'INAPP'
      AND ptl.status = 'active'
    LIMIT 1
  `;
  const { rows } = await pool.query(q, [pub_code, offer_id]);
  if (!rows.length) throw new Error("Invalid INAPP pub_code / offer mapping");
  return rows[0];
}

/* ======================================================
   📩 INAPP: SEND PIN
====================================================== */
router.post("/inapp/sendpin", async (req, res) => {
  try {
    const { msisdn, offer_id, pub_id } = req.body;
    if (!msisdn || !offer_id || !pub_id)
      return res.status(400).json({ error: "Missing params" });

    const ctx = await resolveInappContext(pub_id, offer_id);

    const api_status = "success"; // operator response placeholder

    await pool.query(
      `
      INSERT INTO pin_send_logs
      (offer_id, pub_code, tracking_link_id, msisdn, api_status, created_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      `,
      [offer_id, pub_id, ctx.tracking_link_id, msisdn, api_status]
    );

    res.json({ success: true });

  } catch (err) {
    console.error("SENDPIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   🔐 INAPP: VERIFY PIN
====================================================== */
router.post("/inapp/verifypin", async (req, res) => {
  try {
    const { msisdn, pin, offer_id, pub_id } = req.body;
    if (!msisdn || !pin || !offer_id || !pub_id)
      return res.status(400).json({ error: "Missing params" });

    const ctx = await resolveInappContext(pub_id, offer_id);
    const verify_status = "success";

    await pool.query(
      `
      INSERT INTO pin_verify_logs
      (offer_id, pub_code, tracking_link_id, msisdn, pin, verify_status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      `,
      [offer_id, pub_id, ctx.tracking_link_id, msisdn, pin, verify_status]
    );

    res.json({ verified: verify_status === "success" });

  } catch (err) {
    console.error("VERIFYPIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   💳 INAPP: SUBSCRIBE
====================================================== */
router.post("/inapp/subscribe", async (req, res) => {
  try {
    const { msisdn, offer_id, pub_id } = req.body;
    if (!msisdn || !offer_id || !pub_id)
      return res.status(400).json({ error: "Missing params" });

    const ctx = await resolveInappContext(pub_id, offer_id);
    const status = "success";

    await pool.query(
      `
      INSERT INTO subscription_logs
      (offer_id, pub_code, tracking_link_id, msisdn, status, activation_time)
      VALUES ($1,$2,$3,$4,$5,NOW())
      `,
      [offer_id, pub_id, ctx.tracking_link_id, msisdn, status]
    );

    res.json({ subscribed: true });

  } catch (err) {
    console.error("SUBSCRIBE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   📊 INAPP FINAL REPORT (CR + PROFIT)
====================================================== */
router.get("/reports/inapp", authJWT, async (req, res) => {
  try {
    const query = `
      SELECT
        ps.pub_code AS "PUB_ID",
        o.advertiser_name AS "Advertiser Name",
        o.offer_id AS "Offer ID",
        o.name AS "Offer Name",
        DATE(ps.created_at) AS "Report Date",

        COUNT(ps.id) AS "Pin Request Count",
        COUNT(DISTINCT ps.msisdn) AS "Unique Pin Request Count",

        COUNT(ps.id) FILTER (WHERE ps.api_status='success') AS "Pin Send Count",
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.api_status='success')
          AS "Unique Pin Send Count",

        COUNT(pv.id) AS "Pin Validation RequestCount",
        COUNT(DISTINCT pv.msisdn) AS "Unique Pin Validation RequestCount",

        COUNT(pv.id) FILTER (WHERE pv.verify_status='success')
          AS "Pin Validate Count",

        COUNT(DISTINCT sl.msisdn) AS "Send Conversion Count",

        ROUND(
          COUNT(pv.id) FILTER (WHERE pv.verify_status='success') * 100.0 /
          NULLIF(COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.api_status='success'),0),
        2) AS "CR IN (%)",

        ROUND(
          COUNT(DISTINCT sl.msisdn) * 100.0 /
          NULLIF(COUNT(pv.id) FILTER (WHERE pv.verify_status='success'),0),
        2) AS "CR OUT (%)",

        COUNT(DISTINCT sl.msisdn) * o.payout AS "Advertiser Amount",
        COUNT(DISTINCT sl.msisdn) * ptl.payout AS "Publisher Cost",

        (COUNT(DISTINCT sl.msisdn) * o.payout)
        - (COUNT(DISTINCT sl.msisdn) * ptl.payout) AS "Profit"

      FROM pin_send_logs ps
      JOIN offers o ON o.offer_id = ps.offer_id
      JOIN publisher_tracking_links ptl ON ptl.id = ps.tracking_link_id

      LEFT JOIN pin_verify_logs pv
        ON pv.msisdn = ps.msisdn AND pv.offer_id = ps.offer_id

      LEFT JOIN subscription_logs sl
        ON sl.msisdn = ps.msisdn AND sl.offer_id = ps.offer_id AND sl.status='success'

      GROUP BY
        ps.pub_code, o.advertiser_name, o.offer_id, o.name,
        o.payout, ptl.payout, DATE(ps.created_at)

      ORDER BY "Report Date" DESC;
    `;

    const { rows } = await pool.query(query);
    res.json(rows);

  } catch (err) {
    console.error("INAPP REPORT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
