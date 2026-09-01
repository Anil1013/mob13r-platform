


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
   🎯 TRAFFIC RESOLVER
   Given the offer a publisher originally sent traffic to, decides which
   offer should ACTUALLY serve it:
   1. If this offer's geo+carrier has an active Offer Group configured,
      weighted-randomly pick among that group's currently active,
      non-capped members (same distribution the standalone Group-URL
      feature uses — just applied automatically, no separate URL needed).
   2. Otherwise just use the originally-requested offer directly.
   3. Whichever offer that resolves to, if it turns out to be inactive
      or capped, fall through to any active, non-capped offer marked
      service_type='FALLBACK' for the same geo+carrier — this does NOT
      require the fallback offer to be individually assigned to this
      publisher.
   4. If nothing usable is found at any step, returns GLOBAL_CAP_REACHED.
===================================================== */
async function resolveTrafficOffer(originalOfferId) {
  const origRes = await pool.query(
    `SELECT id, org_id, geo, carrier FROM offers WHERE id = $1`,
    [originalOfferId]
  );
  if (!origRes.rows.length) return { error: "INVALID_OFFER" };
  const orig = origRes.rows[0];

  // Reset today_hits first if stale from a previous day, for every offer
  // sharing this geo+carrier — otherwise a capped-yesterday offer could
  // look capped today even at zero real usage.
  await pool.query(
    `UPDATE offers SET today_hits = 0, last_reset_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
     WHERE org_id = $1 AND geo = $2 AND carrier = $3
       AND last_reset_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
    [orig.org_id, orig.geo, orig.carrier]
  );

  const isUsable = (row) =>
    row.status === "active" && (row.daily_cap === null || row.today_hits < row.daily_cap);

  // Step 1: is there an active Offer Group covering this geo+carrier?
  const groupRes = await pool.query(
    `SELECT id FROM offer_groups WHERE org_id = $1 AND geo = $2 AND carrier = $3 AND status = 'active' LIMIT 1`,
    [orig.org_id, orig.geo, orig.carrier]
  );

  let picked = null;

  if (groupRes.rows.length) {
    const items = await pool.query(
      `SELECT o.id, o.status, o.daily_cap, o.today_hits, ogi.weight
       FROM offer_group_items ogi
       JOIN offers o ON o.id = ogi.offer_id
       WHERE ogi.group_id = $1 AND ogi.status = 'active'`,
      [groupRes.rows[0].id]
    );
    const usableItems = items.rows.filter(isUsable);
    if (usableItems.length) {
      const total = usableItems.reduce((s, r) => s + Number(r.weight), 0);
      let rand = Math.random() * total;
      picked = usableItems[usableItems.length - 1];
      for (const row of usableItems) {
        rand -= Number(row.weight);
        if (rand <= 0) { picked = row; break; }
      }
    }
    // If the group exists but has zero usable members right now, fall
    // through to the fallback-offer check below (picked stays null) —
    // do NOT fall back to the single originally-requested offer, since
    // it's already accounted for as one of the group's own members.
  } else {
    // No group for this geo+carrier — just check the single requested offer.
    const singleRes = await pool.query(
      `SELECT id, status, daily_cap, today_hits FROM offers WHERE id = $1`,
      [originalOfferId]
    );
    if (singleRes.rows.length && isUsable(singleRes.rows[0])) {
      picked = singleRes.rows[0];
    }
  }

  if (picked) return { offer_id: picked.id };

  // Step 2: fallback — any active, non-capped FALLBACK offer for this
  // geo+carrier, regardless of publisher assignment.
  const fbRes = await pool.query(
    `SELECT id FROM offers
     WHERE org_id = $1 AND geo = $2 AND carrier = $3
       AND service_type = 'FALLBACK' AND status = 'active'
       AND (daily_cap IS NULL OR today_hits < daily_cap)
     ORDER BY id ASC LIMIT 1`,
    [orig.org_id, orig.geo, orig.carrier]
  );
  if (fbRes.rows.length) return { offer_id: fbRes.rows[0].id };

  // Step 3: nothing usable anywhere for this geo+carrier.
  return { error: "GLOBAL_CAP_REACHED" };
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

    // This publisher must be assigned to the offer they're sending to —
    // that assignment's payout terms (publisher_offer_id/publisher_cpa)
    // are what they get credited with, regardless of which offer
    // actually ends up serving the traffic below (group-distributed or
    // a fallback) — the publisher's own agreed rate doesn't change just
    // because we route it through a different advertiser internally.
    const assignRes = await pool.query(
      `SELECT po.id AS publisher_offer_id, po.publisher_cpa, o.geo, o.carrier
       FROM publisher_offers po
       JOIN offers o ON o.id = po.offer_id
       WHERE o.id = $1 AND po.publisher_id = $2 AND po.status = 'active'`,
      [offer_id, publisher.id]
    );
    if (!assignRes.rows.length) {
      return res.status(403).json({ status: "INVALID_OFFER" });
    }
    const assignment = assignRes.rows[0];

    if (geo && assignment.geo && geo !== assignment.geo) {
      return res.status(400).json({ status: "GEO_MISMATCH" });
    }
    if (carrier && assignment.carrier && carrier !== assignment.carrier) {
      return res.status(400).json({ status: "CARRIER_MISMATCH" });
    }

    // Resolve WHICH offer actually serves this traffic: weighted
    // distribution among an Offer Group's members if one covers this
    // geo+carrier, otherwise the single requested offer directly, with
    // an active/non-capped FALLBACK offer as the last resort.
    const resolved = await resolveTrafficOffer(offer_id);

    if (resolved.error === "GLOBAL_CAP_REACHED") {
      return res.status(409).json({
        status: "GLOBAL_CAP_REACHED",
        message: "All offers for this geo/carrier — including any fallback — are inactive or have reached their daily cap.",
      });
    }
    if (resolved.error) {
      return res.status(403).json({ status: resolved.error });
    }

    const resolvedOfferId = resolved.offer_id;

    /* Internal call */
    const internal = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/send/${resolvedOfferId}`,
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
          assignment.publisher_offer_id,
          assignment.publisher_cpa,
          data.session_token,
        ]
      );
    }

    return res.json({
      ...mapPublisherResponse(data),
      offer_id: resolvedOfferId,
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

// 🔥 FINAL SUCCESS DETECTION (bulletproof)
const isSuccess =
  advData?.status === "SUCCESS" ||
  advData?.status === true ||
  advData?.status === "true" ||
  advData?.message === "SUCCESS" ||
  advData?.forced === true ||
  advData?.session_token;   // 👈 MOST IMPORTANT

// 🔥 ALWAYS proceed if VERIFIED in DB
const verifyRow = await client.query(
  `
  SELECT *
  FROM pin_sessions
  WHERE parent_session_token = $1
  AND status = 'VERIFIED'
  ORDER BY created_at DESC
  LIMIT 1
  `,
  [session_token]
);

if (!verifyRow.rows.length) {
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
  WHERE parent_session_token = $1
  AND status = 'VERIFIED'
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

/* =====================================================
   📤 PREPARE ANTIFRAUD FOR VERIFY
   Called by the landing page right when it shows the OTP-entry screen
   (before the user submits) — see pin.routes.js for the full explanation.
   No crediting/geo/cap logic needed here, just forward through.
===================================================== */
router.all("/pin/prepare-verify", publisherAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const internal = await axios({
      method: req.method,
      url: `${INTERNAL_API_BASE}/api/pin/prepare-verify`,
      timeout: AXIOS_TIMEOUT,
      params: req.method === "GET" ? params : undefined,
      data: req.method !== "GET" ? params : undefined,
      validateStatus: () => true,
    });
    return res.json(internal.data);
  } catch (err) {
    console.error("PUBLISHER PREPARE VERIFY ERROR:", err);
    return res.json({ status: "SUCCESS", antifraud_uniqid: null, injected_script: null }); // fail open
  }
});

export default router;
