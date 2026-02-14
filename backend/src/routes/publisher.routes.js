import express from "express";
import axios from "axios";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";
import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE || "https://backend.mob13r.com";

/* ================= HELPERS ================= */
function enrichParams(req, params) {
  return {
    ...params,
    ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.ip,
    user_agent: req.headers["user-agent"] || "",
  };
}

/* Remove unwanted keys before forwarding */
function cleanForwardParams(params) {
  const { offer_id, ...clean } = params;
  return clean;
}

/* ================= DAILY RESET HELPER ================= */
function todayClause() {
  return `credited_at::date = CURRENT_DATE`;
}

/* ================= WEIGHTED PICK ================= */
function pickOfferByWeight(rows) {
  const safe = rows.map((r) => ({
    ...r,
    weight: Number(r.weight) > 0 ? Number(r.weight) : 1,
  }));

  const total = safe.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;

  for (const r of safe) {
    if (rand < r.weight) return r;
    rand -= r.weight;
  }

  return safe[0];
}

/* =====================================================
   📤 PUBLISHER PIN SEND
===================================================== */
router.all("/pin/send", publisherAuth, async (req, res) => {
  try {
    const publisher = req.publisher;
    const base = { ...req.query, ...req.body };
    const { msisdn, geo, carrier } = base;

    if (!msisdn || !geo || !carrier) {
      return res.status(400).json({
        status: "FAILED",
        message: "msisdn, geo and carrier required",
      });
    }

    const enriched = enrichParams(req, base);

    const offersRes = await pool.query(
      `
      SELECT
        po.id AS publisher_offer_id,
        po.publisher_cpa,
        po.pass_percent,
        po.daily_cap,
        po.weight,
        o.id AS offer_id
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      WHERE po.publisher_id = $1
        AND po.status = 'active'
        AND o.status = 'active'
        AND o.geo = $2
        AND o.carrier = $3
      `,
      [publisher.id, geo, carrier]
    );

    if (!offersRes.rows.length) {
      return res.status(404).json({
        status: "NO_OFFER",
        message: "No matching offers",
      });
    }

    const picked = pickOfferByWeight(offersRes.rows);

    /* ✅ CLEAN PARAMS (NO offer_id DUPLICATION) */
    const forwardParams = cleanForwardParams(enriched);

    const internal = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/send/${picked.offer_id}`,
      params: req.method === "GET" ? forwardParams : undefined,
      data: req.method !== "GET" ? forwardParams : undefined,
      validateStatus: () => true,
    });

    const data = internal.data;

    /* Attach publisher info to session */
    if (data?.session_token) {
      await pool.query(
        `
        UPDATE pin_sessions
        SET publisher_id = $1,
            publisher_offer_id = $2,
            publisher_cpa = $3
        WHERE session_token = $4::uuid
        `,
        [
          publisher.id,
          picked.publisher_offer_id,
          picked.publisher_cpa,
          data.session_token,
        ]
      );
    }

    return res.json(mapPublisherResponse(data));
  } catch (err) {
    console.error("PUBLISHER PIN SEND ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Publisher pin send failed",
    });
  }
});

/* =====================================================
   ✅ PUBLISHER PIN VERIFY
===================================================== */
router.all("/pin/verify", publisherAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const enriched = enrichParams(req, {
      ...req.query,
      ...req.body,
    });

    const { session_token } = enriched;

    if (!session_token) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token required",
      });
    }

    /* Advertiser verify first */
    const advResp = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/verify`,
      params: req.method === "GET" ? enriched : undefined,
      data: req.method !== "GET" ? enriched : undefined,
      validateStatus: () => true,
    });

    const advData = advResp.data;

    if (advData.status !== "SUCCESS") {
      return res.json(mapPublisherResponse(advData));
    }

    await client.query("BEGIN");

    const sessionRes = await client.query(
      `
      SELECT *
      FROM pin_sessions
      WHERE session_token = $1::uuid
      FOR UPDATE
      `,
      [session_token]
    );

    if (!sessionRes.rows.length) {
      await client.query("ROLLBACK");
      return res.json(mapPublisherResponse(advData));
    }

    const s = sessionRes.rows[0];

    if (s.publisher_credited === true) {
      await client.query("COMMIT");
      return res.json(mapPublisherResponse(advData));
    }

    const ruleRes = await client.query(
      `
      SELECT daily_cap, pass_percent
      FROM publisher_offers
      WHERE id = $1
        AND status = 'active'
      `,
      [s.publisher_offer_id]
    );

    if (!ruleRes.rows.length) {
      await client.query("ROLLBACK");
      return res.json(mapPublisherResponse(advData));
    }

    const { daily_cap, pass_percent } = ruleRes.rows[0];

    const creditedRes = await client.query(
      `
      SELECT COUNT(*)::int
      FROM pin_sessions
      WHERE publisher_id = $1
        AND offer_id = $2
        AND publisher_credited = TRUE
        AND ${todayClause()}
      `,
      [s.publisher_id, s.offer_id]
    );

    const creditedToday = creditedRes.rows[0].count;

    if (daily_cap !== null && creditedToday >= daily_cap) {
      await client.query("COMMIT");
      return res.json(mapPublisherResponse(advData, { isHold: true }));
    }

    if (Math.random() * 100 > Number(pass_percent)) {
      await client.query("COMMIT");
      return res.json(mapPublisherResponse(advData, { isHold: true }));
    }

    await client.query(
      `
      UPDATE pin_sessions
      SET publisher_credited = TRUE,
          credited_at = NOW()
      WHERE session_id = $1
      `,
      [s.session_id]
    );

    await client.query("COMMIT");
    return res.json(mapPublisherResponse(advData));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUBLISHER PIN VERIFY ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Publisher pin verify failed",
    });
  } finally {
    client.release();
  }
});

/* =====================================================
   📊 STATUS
===================================================== */
router.get("/pin/status", publisherAuth, async (req, res) => {
  try {
    const { session_token } = req.query;

    if (!session_token) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token required",
      });
    }

    const result = await pool.query(
      `
      SELECT status, verified_at, publisher_credited, credited_at
      FROM pin_sessions
      WHERE session_token = $1::uuid
      `,
      [session_token]
    );

    if (!result.rows.length) {
      return res.json({ status: "NO_SESSION" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   🔗 PORTAL
===================================================== */
router.get("/portal", publisherAuth, async (req, res) => {
  try {
    const { session_token } = req.query;

    if (!session_token) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token required",
      });
    }

    const result = await pool.query(
      `
      SELECT portal_url
      FROM pin_sessions
      WHERE session_token = $1::uuid
      `,
      [session_token]
    );

    if (!result.rows.length || !result.rows[0].portal_url) {
      return res.status(404).json({
        status: "FAILED",
        message: "Portal URL not found",
      });
    }

    return res.redirect(result.rows[0].portal_url);
  } catch (err) {
    return res.status(500).json({ status: "FAILED" });
  }
});

export default router;
