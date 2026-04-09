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

/* =====================================================
   📤 PIN SEND
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

    /* Offer validation */
    const offerRes = await pool.query(
      `SELECT 
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
        AND o.status = 'active'`,
      [offer_id, publisher.id]
    );

    if (!offerRes.rows.length) {
      return res.status(403).json({ status: "INVALID_OFFER" });
    }

    const picked = offerRes.rows[0];

    /* GEO / Carrier validation */
    if (geo && picked.geo && geo !== picked.geo) {
      return res.status(400).json({ status: "GEO_MISMATCH" });
    }

    if (carrier && picked.carrier && carrier !== picked.carrier) {
      return res.status(400).json({ status: "CARRIER_MISMATCH" });
    }

    /* Call advertiser */
    const internal = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/send/${picked.offer_id}`,
      timeout: AXIOS_TIMEOUT,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });

    const data = internal.data;

    /* 🔥 CRITICAL FIX: Insert row if not exists */
    if (data?.session_token) {
      await pool.query(
        `INSERT INTO pin_sessions 
        (session_token, publisher_id, publisher_offer_id, publisher_cpa, offer_id, msisdn, status)
        VALUES ($1,$2,$3,$4,$5,$6,'PENDING')
        ON CONFLICT (session_token) 
        DO UPDATE SET 
          publisher_id = EXCLUDED.publisher_id,
          publisher_offer_id = EXCLUDED.publisher_offer_id,
          publisher_cpa = EXCLUDED.publisher_cpa`,
        [
          data.session_token,
          publisher.id,
          picked.publisher_offer_id,
          picked.publisher_cpa,
          picked.offer_id,
          msisdn,
        ]
      );
    }

    return res.json({
      ...mapPublisherResponse(data),
      offer_id: picked.offer_id,
    });
  } catch (err) {
    console.error("PIN SEND ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  }
});

/* =====================================================
   ✅ PIN VERIFY (FINAL FIXED)
===================================================== */

router.all("/pin/verify", publisherAuth, async (req, res) => {
  const client = await pool.connect();

  try {
    const publisher = req.publisher;
    const params = enrichParams(req, { ...req.query, ...req.body });
    const { session_token } = params;

    if (!session_token) {
      return res.status(400).json({
        status: "FAILED",
        message: "session_token required",
      });
    }

    /* 1. Advertiser verify */
    const advResp = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/verify`,
      timeout: AXIOS_TIMEOUT,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });

    const advData = advResp.data;

    const isSuccess =
      advData?.status === "SUCCESS" ||
      advData?.status === true ||
      advData?.verified === true;

    if (!isSuccess) {
      return res.json(mapPublisherResponse(advData));
    }

    /* 2. Find session */
    const sessionRes = await client.query(
      `SELECT * FROM pin_sessions 
       WHERE session_token::text = $1 
          OR parent_session_token::text = $1
       ORDER BY created_at DESC LIMIT 1`,
      [session_token]
    );

    if (!sessionRes.rows.length) {
      return res.json(mapPublisherResponse(advData));
    }

    await client.query("BEGIN");

    /* LOCK row */
    const lockRes = await client.query(
      `SELECT * FROM pin_sessions 
       WHERE session_id = $1 FOR UPDATE`,
      [sessionRes.rows[0].session_id]
    );

    const session = lockRes.rows[0];

    /* 🔥 Duplicate protection */
    if (session.publisher_credited) {
      await client.query("COMMIT");
      return res.json(mapPublisherResponse(advData));
    }

    /* 3. Rules */
    const ruleRes = await client.query(
      `SELECT daily_cap, pass_percent 
       FROM publisher_offers 
       WHERE id = $1 AND status='active'`,
      [session.publisher_offer_id]
    );

    if (ruleRes.rows.length) {
      const { daily_cap, pass_percent } = ruleRes.rows[0];

      /* Daily cap (IST) */
      const capRes = await client.query(
        `SELECT COUNT(*)::int FROM pin_sessions
         WHERE publisher_id=$1 
           AND offer_id=$2 
           AND publisher_credited=TRUE
           AND (credited_at AT TIME ZONE 'UTC' 
           AT TIME ZONE 'Asia/Kolkata')::date = CURRENT_DATE`,
        [publisher.id, session.offer_id]
      );

      if (daily_cap && capRes.rows[0].count >= daily_cap) {
        await client.query("COMMIT");
        return res.json(
          mapPublisherResponse(advData, { isHold: true })
        );
      }

      /* Pass percentage */
      if (pass_percent !== null && pass_percent < 100) {
        if ((Math.random() * 100) >= pass_percent) {
          await client.query("COMMIT");
          return res.json(
            mapPublisherResponse(advData, { isHold: true })
          );
        }
      }
    }

    /* 4. CREDIT */
    await client.query(
      `UPDATE pin_sessions
       SET publisher_credited = TRUE,
           credited_at = NOW(),
           status = 'VERIFIED'
       WHERE session_id = $1`,
      [session.session_id]
    );

    await client.query("COMMIT");

    return res.json(mapPublisherResponse(advData));

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  } finally {
    client.release();
  }
});

export default router;
