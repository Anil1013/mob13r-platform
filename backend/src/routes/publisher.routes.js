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

/* ================= WEIGHTED PICK ================= */
function pickOfferByWeight(rows) {
  const safeRows = rows.map((r) => ({
    ...r,
    weight: Number(r.weight) > 0 ? Number(r.weight) : 1,
  }));

  const total = safeRows.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;

  for (const r of safeRows) {
    if (rand < r.weight) return r;
    rand -= r.weight;
  }

  return safeRows[0];
}

/* =====================================================
   📤 PUBLISHER PIN SEND
   GET / POST  /api/publisher/pin/send
===================================================== */
router.all("/pin/send", publisherAuth, async (req, res) => {
  try {
    const publisher = req.publisher;
    const baseParams = { ...req.query, ...req.body };
    const { msisdn, geo, carrier } = baseParams;

    if (!msisdn || !geo || !carrier) {
      return res.status(400).json({
        status: "FAILED",
        message: "msisdn, geo and carrier required",
      });
    }

    const params = enrichParams(req, baseParams);

    /* 🔍 LOAD PUBLISHER OFFERS */
    const offersRes = await pool.query(
      `
      SELECT
        po.id AS publisher_offer_id,
        po.publisher_cpa,
        po.pass_percent,
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
        message: "No matching offers for publisher",
      });
    }

    /* 🎯 PICK OFFER (WEIGHT ONLY) */
    const picked = pickOfferByWeight(offersRes.rows);

    /* 🔗 CALL INTERNAL PIN SEND */
    const internalResp = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/send/${picked.offer_id}`,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });

    const data = internalResp.data;

    /* 🔐 MAP PUBLISHER INTO SESSION */
    if (data?.session_token) {
      await pool.query(
        `
        UPDATE pin_sessions
        SET publisher_id = $1,
            publisher_offer_id = $2,
            publisher_cpa = $3
        WHERE session_token = $4
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
   (NO pass %, NO cap logic here)
===================================================== */
router.all("/pin/verify", publisherAuth, async (req, res) => {
  try {
    const params = enrichParams(req, { ...req.query, ...req.body });

    const internalResp = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/verify`,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });

    return res.json(mapPublisherResponse(internalResp.data));
  } catch (err) {
    console.error("PUBLISHER PIN VERIFY ERROR:", err);
    return res.status(500).json({
      status: "FAILED",
      message: "Publisher pin verify failed",
    });
  }
});

/* =====================================================
   📊 PUBLISHER PIN STATUS
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
      SELECT status, verified_at
      FROM pin_sessions
      WHERE session_token = $1
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
   🔗 PUBLISHER PORTAL REDIRECT
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
      WHERE session_token = $1
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
