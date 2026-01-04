import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

/* =====================================================
   🧠 DATE FILTER HELPER (DAILY RESET SAFE)
===================================================== */
function buildDateFilter(query, baseIndex = 2) {
  const { range, from, to } = query;

  if (range === "yesterday") {
    return {
      sql: "created_at::date = CURRENT_DATE - INTERVAL '1 day'",
      params: [],
    };
  }

  if (from && to) {
    return {
      sql: `created_at::date BETWEEN $${baseIndex} AND $${baseIndex + 1}`,
      params: [from, to],
    };
  }

  // default = today
  return {
    sql: "created_at::date = CURRENT_DATE",
    params: [],
  };
}

/* =====================================================
   📊 DASHBOARD SUMMARY
===================================================== */
router.get("/dashboard/summary", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    const dateFilter = buildDateFilter(req.query);

    const stats = await pool.query(
      `
      SELECT
        COUNT(*) AS total_pin_requests,
        COUNT(DISTINCT msisdn) AS unique_pin_requests,

        COUNT(*) FILTER (WHERE status IN ('OTP_SENT','VERIFIED')) AS total_pin_sent,
        COUNT(DISTINCT msisdn) FILTER (WHERE status IN ('OTP_SENT','VERIFIED')) AS unique_pin_sent,

        COUNT(*) FILTER (WHERE otp_attempts >= 1 OR status='VERIFIED') AS pin_verification_requests,
        COUNT(DISTINCT msisdn) FILTER (WHERE otp_attempts >= 1 OR status='VERIFIED') AS unique_pin_verification_requests,

        COUNT(*) FILTER (WHERE publisher_credited = TRUE) AS pin_verified
      FROM pin_sessions
      WHERE publisher_id = $1
        AND ${dateFilter.sql}
      `,
      [publisherId, ...dateFilter.params]
    );

    const revenue = await pool.query(
      `
      SELECT COALESCE(SUM(publisher_cpa),0) AS revenue
      FROM publisher_conversions
      WHERE publisher_id = $1
        AND status='SUCCESS'
        AND ${dateFilter.sql}
      `,
      [publisherId, ...dateFilter.params]
    );

    const r = stats.rows[0];
    const CR =
      Number(r.unique_pin_sent) > 0
        ? ((Number(r.pin_verified) / Number(r.unique_pin_sent)) * 100).toFixed(2)
        : "0.00";

    res.json({
      status: "SUCCESS",
      data: {
        ...r,
        CR: `${CR}%`,
        revenue: `$${Number(revenue.rows[0].revenue).toFixed(2)}`,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   📋 DASHBOARD OFFERS + CAP UTILIZATION (LIVE %)
===================================================== */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    const dateFilter = buildDateFilter(req.query, 2);

    const result = await pool.query(
      `
      SELECT
        o.id AS offer_id,
        o.service_name AS offer,
        o.geo,
        o.carrier,
        po.publisher_cpa AS cpa,
        o.daily_cap AS cap,

        COUNT(ps.id) AS pin_requests,
        COUNT(ps.id) FILTER (WHERE ps.publisher_credited = TRUE) AS credited,

        COALESCE(SUM(pc.publisher_cpa),0) AS revenue

      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id

      LEFT JOIN pin_sessions ps
        ON ps.publisher_offer_id = po.id
       AND ${dateFilter.sql}

      LEFT JOIN publisher_conversions pc
        ON pc.pin_session_id = ps.id
       AND pc.status='SUCCESS'

      WHERE po.publisher_id = $1
        AND po.status='active'

      GROUP BY o.id, o.service_name, o.geo, o.carrier, po.publisher_cpa, o.daily_cap
      ORDER BY o.id
      `,
      [publisherId, ...dateFilter.params]
    );

    const data = result.rows.map((r) => {
      const capUsed = Number(r.credited);
      const cap = r.cap || 0;

      const capUtilization =
        cap > 0 ? ((capUsed / cap) * 100).toFixed(2) : "0.00";

      return {
        offer_id: r.offer_id,
        offer: r.offer,
        geo: r.geo,
        carrier: r.carrier,
        cpa: `$${Number(r.cpa).toFixed(2)}`,
        daily_cap: cap,
        used: capUsed,
        cap_utilization: `${capUtilization}%`,
        revenue: `$${Number(r.revenue).toFixed(2)}`,
      };
    });

    res.json({ status: "SUCCESS", data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   💰 PUBLISHER PAYOUT / INVOICE REPORT
   GET /api/publisher/dashboard/payout
===================================================== */
router.get("/dashboard/payout", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    const dateFilter = buildDateFilter(req.query);

    const rows = await pool.query(
      `
      SELECT
        o.service_name AS offer,
        o.geo,
        o.carrier,
        COUNT(pc.id) AS conversions,
        SUM(pc.publisher_cpa) AS payout
      FROM publisher_conversions pc
      JOIN pin_sessions ps ON ps.id = pc.pin_session_id
      JOIN offers o ON o.id = ps.offer_id

      WHERE pc.publisher_id = $1
        AND pc.status='SUCCESS'
        AND ${dateFilter.sql}

      GROUP BY o.service_name, o.geo, o.carrier
      ORDER BY o.service_name
      `,
      [publisherId, ...dateFilter.params]
    );

    const total = rows.rows.reduce(
      (s, r) => s + Number(r.payout || 0),
      0
    );

    res.json({
      status: "SUCCESS",
      total_payout: `$${total.toFixed(2)}`,
      data: rows.rows.map((r) => ({
        ...r,
        payout: `$${Number(r.payout).toFixed(2)}`,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED" });
  }
});

export default router;
