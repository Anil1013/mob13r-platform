// backend/src/routes/publisher.routes.js

import express from "express";
import axios from "axios";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";
import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */

const INTERNAL_API_BASE =
  process.env.INTERNAL_API_BASE || "https://backend.mob13r.com";

const AXIOS_TIMEOUT = 15000;

/* ================= HELPERS ================= */

function enrichParams(req, params) {
  return {
    ...params,
    ip:
      (req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim() || req.socket?.remoteAddress,
    user_agent: req.headers["user-agent"] || "",
  };
}

function todayClause() {
  return `credited_at::date = CURRENT_DATE`;
}

/* =====================================================
   📤 PUBLISHER PIN SEND (offer_id based)
===================================================== */

router.all("/pin/send", publisherAuth, async (req, res) => {
  try {
    const publisher = req.publisher;
    const base = { ...req.query, ...req.body };

    const { offer_id, msisdn, geo, carrier } = base;

    if (!offer_id || !msisdn) {
      return res.status(400).json({
        status: "FAILED",
        message: "offer_id and msisdn required",
      });
    }

    const params = enrichParams(req, base);

    /* Validate assignment */
    const offerRes = await pool.query(
      `
      SELECT 
        po.id AS publisher_offer_id,
        po.publisher_cpa,
        o.id AS offer_id,
        o.geo,
        o.carrier
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      WHERE o.id = $1
        AND po.publisher_id = $2
        AND po.status = 'active'
        AND o.status = 'active'
      `,
      [offer_id, publisher.id]
    );

    if (!offerRes.rows.length) {
      return res.status(403).json({
        status: "INVALID_OFFER",
      });
    }

    const picked = offerRes.rows[0];

    if (geo && picked.geo && geo !== picked.geo) {
      return res.status(400).json({ status: "GEO_MISMATCH" });
    }

    if (carrier && picked.carrier && carrier !== picked.carrier) {
      return res.status(400).json({ status: "CARRIER_MISMATCH" });
    }

    /* Internal call */
    const internal = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/send/${picked.offer_id}`,
      timeout: AXIOS_TIMEOUT,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });

    const data = internal.data;

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

    return res.json({
      ...mapPublisherResponse(data),
      offer_id: picked.offer_id,
    });
  } catch (err) {
    console.error("PUBLISHER PIN SEND ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
    ✅ PUBLISHER PIN VERIFY (Updated with Fixes)
===================================================== */
router.all("/pin/verify", publisherAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const publisher = req.publisher;
    const params = enrichParams(req, { ...req.query, ...req.body });
    
    // Ye wo token hai jo publisher bhej raha hai (Jo uske liye session_token hai)
    const incomingToken = params.session_token; 

    if (!incomingToken) {
      return res.status(400).json({ status: "FAILED", message: "session_token required" });
    }

    // 1. Advertiser call (Verification check)
    const advResp = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/verify`,
      timeout: AXIOS_TIMEOUT,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });

    const advData = advResp.data;

    // 2. DB Search Logic: 
    // Hum check kar rahe hain ki incomingToken ya toh session_token ho ya parent_session_token
    // Aur status 'VERIFIED' ho.
    const verifyRowRes = await client.query(
      `
      SELECT *
      FROM pin_sessions
      WHERE (session_token::text = $1 OR parent_session_token::text = $1)
        AND status = 'VERIFIED'
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [incomingToken]
    );

    // Agar status abhi update nahi hua par Advertiser Success hai, toh hum fallback search karenge
    let session;
    if (!verifyRowRes.rows.length) {
       const fallback = await client.query(
         `SELECT * FROM pin_sessions 
          WHERE (session_token::text = $1 OR parent_session_token::text = $1) 
          ORDER BY created_at DESC LIMIT 1`,
         [incomingToken]
       );
       if (!fallback.rows.length) {
          return res.json(mapPublisherResponse(advData));
       }
       session = fallback.rows[0];
    } else {
       session = verifyRowRes.rows[0];
    }

    await client.query("BEGIN");

    // Row Lock for transaction
    const sRes = await client.query(
      `SELECT * FROM pin_sessions WHERE session_id = $1 FOR UPDATE`,
      [session.session_id]
    );
    const s = sRes.rows[0];

    // Security & Duplicate Check
    if (s.publisher_id !== publisher.id) { await client.query("ROLLBACK"); return res.status(403).json({status:"FORBIDDEN"}); }
    if (s.publisher_credited) { await client.query("COMMIT"); return res.json(mapPublisherResponse(advData)); }

    // 3. HOLD / FILTER LOGIC
    const ruleRes = await client.query(
      `SELECT daily_cap, pass_percent FROM publisher_offers WHERE id = $1 AND status='active'`,
      [s.publisher_offer_id]
    );

    if (ruleRes.rows.length) {
      const { daily_cap, pass_percent } = ruleRes.rows[0];

      // Daily Cap Check (IST Timezone)
      const creditedRes = await client.query(
        `SELECT COUNT(*)::int FROM pin_sessions 
         WHERE publisher_id=$1 AND offer_id=$2 AND publisher_credited=TRUE 
         AND (credited_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = CURRENT_DATE`,
        [publisher.id, s.offer_id]
      );

      if (daily_cap !== null && creditedRes.rows[0].count >= daily_cap) {
        await client.query("COMMIT");
        return res.json(mapPublisherResponse(advData, { isHold: true }));
      }

      // Pass % Check
      if (Number(pass_percent ?? 100) < 100) {
        if ((Math.random() * 100) >= Number(pass_percent)) {
          await client.query("COMMIT");
          return res.json(mapPublisherResponse(advData, { isHold: true }));
        }
      }
    }

    // 4. FINAL UPDATE (Crediting the Publisher)
    await client.query(
      `UPDATE pin_sessions SET publisher_credited=TRUE, credited_at=NOW() WHERE session_id = $1`,
      [s.session_id]
    );

    await client.query("COMMIT");
    return res.json(mapPublisherResponse(advData));

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  } finally {
    client.release();
  }
});

export default router;
