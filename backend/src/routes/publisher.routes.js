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
   ✅ PUBLISHER PIN VERIFY
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

    /* Advertiser truth */
    const advResp = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/verify`,
      timeout: AXIOS_TIMEOUT,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
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
      WHERE session_token = $1
      FOR UPDATE
      `,
      [session_token]
    );

    if (!sessionRes.rows.length) {
      await client.query("ROLLBACK");
      return res.json(mapPublisherResponse(advData));
    }

    const s = sessionRes.rows[0];

    if (s.publisher_id !== publisher.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({ status: "FORBIDDEN" });
    }

    if (s.publisher_credited) {
      await client.query("COMMIT");
      return res.json(mapPublisherResponse(advData));
    }

    const ruleRes = await client.query(
      `
      SELECT daily_cap, pass_percent
      FROM publisher_offers
      WHERE id = $1 AND status='active'
      `,
      [s.publisher_offer_id]
    );

    if (!ruleRes.rows.length) {
      await client.query("ROLLBACK");
      return res.json(mapPublisherResponse(advData));
    }

    const { daily_cap, pass_percent } = ruleRes.rows[0];

    /* Daily cap check */
    const creditedRes = await client.query(
      `
      SELECT COUNT(*)::int
      FROM pin_sessions
      WHERE publisher_id=$1
        AND offer_id=$2
        AND publisher_credited=TRUE
        AND ${todayClause()}
      `,
      [publisher.id, s.offer_id]
    );

    if (
      daily_cap !== null &&
      creditedRes.rows[0].count >= daily_cap
    ) {
      await client.query("COMMIT");
      return res.json(
        mapPublisherResponse(advData, { isHold: true })
      );
    }

    /* Pass % */
    const pass = Number(pass_percent ?? 100);
    if (pass < 100) {
      const random = Math.random() * 100;
      if (random >= pass) {
        await client.query("COMMIT");
        return res.json(
          mapPublisherResponse(advData, { isHold: true })
        );
      }
    }

    await client.query(
      `
      UPDATE pin_sessions
      SET publisher_credited=TRUE,
          credited_at=NOW()
      WHERE session_token=$1
      `,
      [session_token]
    );

    await client.query("COMMIT");

    return res.json(mapPublisherResponse(advData));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUBLISHER PIN VERIFY ERROR:", err);
    return res.status(500).json({ status: "FAILED" });
  } finally {
    client.release();
  }
});

export default router;
