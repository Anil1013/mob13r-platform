import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";

const router = express.Router();

// 👇 CORS for Publisher Dashboard ONLY
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-publisher-key"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  // Preflight request
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});


/* =====================================================
   🧠 DATE FILTER HELPER (SAFE)
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
   📊 DASHBOARD SUMMARY (UNCHANGED)
===================================================== */
router.get("/dashboard/summary", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    const dateFilter = buildDateFilter(req.query);

    const statsRes = await pool.query(
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

    const revenueRes = await pool.query(
      `
      SELECT COALESCE(SUM(publisher_cpa),0) AS revenue
      FROM publisher_conversions
      WHERE publisher_id = $1
        AND status='SUCCESS'
        AND ${dateFilter.sql}
      `,
      [publisherId, ...dateFilter.params]
    );

    const r = statsRes.rows[0];
    const CR =
      Number(r.unique_pin_sent) > 0
        ? ((Number(r.pin_verified) / Number(r.unique_pin_sent)) * 100).toFixed(2)
        : "0.00";

    res.json({
      status: "SUCCESS",
      range: req.query.range || "today",
      data: {
        ...r,
        CR: `${CR}%`,
        revenue: `$${Number(revenueRes.rows[0].revenue).toFixed(2)}`,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   📋 DASHBOARD OFFERS (UNCHANGED)
===================================================== */
router.get("/dashboard/offers", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    const dateFilter = buildDateFilter(req.query, 2);

    const result = await pool.query(
      `
      SELECT
        o.id AS offer_id,
        o.service_name AS offer_name,
        o.geo,
        o.carrier,
        po.publisher_cpa AS cpa,
        o.daily_cap AS cap,

        COUNT(ps.id) AS pin_request_count,
        COUNT(DISTINCT ps.msisdn) AS unique_pin_request_count,

        COUNT(ps.id) FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED')) AS pin_send_count,
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.status IN ('OTP_SENT','VERIFIED')) AS unique_pin_sent,

        COUNT(ps.id) FILTER (WHERE ps.otp_attempts >= 1 OR ps.status='VERIFIED') AS pin_validation_request_count,
        COUNT(DISTINCT ps.msisdn) FILTER (WHERE ps.otp_attempts >= 1 OR ps.status='VERIFIED') AS unique_pin_validation_request_count,

        COUNT(pc.id) AS unique_pin_verified,
        COALESCE(SUM(pc.publisher_cpa),0) AS revenue
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      LEFT JOIN pin_sessions ps ON ps.publisher_offer_id = po.id AND ${dateFilter.sql}
      LEFT JOIN publisher_conversions pc ON pc.pin_session_id = ps.id AND pc.status='SUCCESS'
      WHERE po.publisher_id = $1
        AND po.status='active'
      GROUP BY o.id, o.service_name, o.geo, o.carrier, po.publisher_cpa, o.daily_cap
      ORDER BY o.id
      `,
      [publisherId, ...dateFilter.params]
    );

    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   3️⃣ PUBLISHER PAYOUT / INVOICE REPORT
===================================================== */
router.get("/dashboard/payout", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;
    const dateFilter = buildDateFilter(req.query);

    const rows = await pool.query(
      `
      SELECT
        o.service_name AS offer,
        COUNT(pc.id) AS conversions,
        SUM(pc.publisher_cpa) AS payout
      FROM publisher_conversions pc
      JOIN pin_sessions ps ON ps.id = pc.pin_session_id
      JOIN offers o ON o.id = ps.offer_id
      WHERE pc.publisher_id = $1
        AND pc.status='SUCCESS'
        AND ${dateFilter.sql}
      GROUP BY o.service_name
      ORDER BY o.service_name
      `,
      [publisherId, ...dateFilter.params]
    );

    const total = rows.rows.reduce((s, r) => s + Number(r.payout || 0), 0);

    res.json({
      status: "SUCCESS",
      total_payout: `$${total.toFixed(2)}`,
      data: rows.rows,
    });
  } catch (err) {
    res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   4️⃣ CAP UTILIZATION (LIVE %)
===================================================== */
router.get("/dashboard/cap-utilization", publisherAuth, async (req, res) => {
  try {
    const publisherId = req.publisher.id;

    const result = await pool.query(
      `
      SELECT
        o.service_name AS offer,
        o.daily_cap,
        COUNT(ps.id) FILTER (WHERE ps.publisher_credited=TRUE) AS used
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      LEFT JOIN pin_sessions ps ON ps.publisher_offer_id = po.id
        AND ps.created_at::date = CURRENT_DATE
      WHERE po.publisher_id = $1
      GROUP BY o.service_name, o.daily_cap
      `,
      [publisherId]
    );

    res.json({
      status: "SUCCESS",
      data: result.rows.map((r) => ({
        ...r,
        utilization:
          r.daily_cap > 0
            ? `${((r.used / r.daily_cap) * 100).toFixed(2)}%`
            : "0%",
      })),
    });
  } catch (err) {
    res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   5️⃣ CSV / EXCEL EXPORT
===================================================== */
router.get("/dashboard/payout/export", publisherAuth, async (req, res) => {
  const publisherId = req.publisher.id;

  const rows = await pool.query(
    `
    SELECT
      pc.created_at::date AS date,
      o.service_name AS offer,
      pc.publisher_cpa AS amount
    FROM publisher_conversions pc
    JOIN pin_sessions ps ON ps.id = pc.pin_session_id
    JOIN offers o ON o.id = ps.offer_id
    WHERE pc.publisher_id = $1
      AND pc.status='SUCCESS'
    ORDER BY pc.created_at
    `,
    [publisherId]
  );

  let csv = "Date,Offer,Amount\n";
  rows.rows.forEach((r) => {
    csv += `${r.date},${r.offer},${r.amount}\n`;
  });

  res.header("Content-Type", "text/csv");
  res.attachment("publisher_payout.csv");
  res.send(csv);
});

/* =====================================================
   6️⃣ MONTHLY INVOICE AUTO-GENERATE
===================================================== */
router.get("/dashboard/invoice/monthly", publisherAuth, async (req, res) => {
  const publisherId = req.publisher.id;
  const { month } = req.query; // YYYY-MM

  const result = await pool.query(
    `
    SELECT
      COUNT(*) AS conversions,
      SUM(publisher_cpa) AS total
    FROM publisher_conversions
    WHERE publisher_id = $1
      AND status='SUCCESS'
      AND to_char(created_at,'YYYY-MM') = $2
    `,
    [publisherId, month]
  );

  res.json({
    status: "SUCCESS",
    month,
    invoice_total: `$${Number(result.rows[0].total || 0).toFixed(2)}`,
    conversions: Number(result.rows[0].conversions),
  });
});

export default router;
