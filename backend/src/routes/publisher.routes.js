import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";
import axios from "axios";

const router = express.Router();

/* ================= INTERNAL API ================= */
const INTERNAL_API = process.env.INTERNAL_API_BASE;

if (!INTERNAL_API) {
  throw new Error("INTERNAL_API_BASE env not set");
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
   🔐 PUBLISHER PIN SEND (GET / POST)
   URL: /api/publisher/pin/send
===================================================== */
router.all("/pin/send", publisherAuth, async (req, res) => {
  try {
    const publisher = req.publisher;
    const params = { ...req.query, ...req.body };

    const { msisdn, geo, carrier } = params;

    if (!msisdn || !geo || !carrier) {
      return res.status(400).json({
        status: "FAILED",
        message: "msisdn, geo, carrier required",
      });
    }

    /* 🔍 LOAD PUBLISHER OFFERS */
    const offersRes = await pool.query(
      `
      SELECT
        po.id AS publisher_offer_id,
        po.publisher_cpa,
        po.pass_percent,
        po.weight,
        o.id AS offer_id,
        o.geo,
        o.carrier
      FROM publisher_offers po
      JOIN offers o ON o.id = po.offer_id
      WHERE po.publisher_id = $1
        AND po.status = 'active'
        AND o.geo = $2
        AND o.carrier = $3
        AND o.status = 'active'
      `,
      [publisher.id, geo, carrier]
    );

    if (!offersRes.rows.length) {
      return res.status(404).json({
        status: "NO_OFFER",
        message: "No matching offers for publisher",
      });
    }

    /* 🎯 PICK OFFER (WEIGHT BASED) */
    const picked = pickOfferByWeight(offersRes.rows);

    /* 🔁 PASS % HOLD LOGIC */
    const passRand = Math.random() * 100;
    if (passRand > Number(picked.pass_percent)) {
      await pool.query(
        `
        INSERT INTO publisher_conversions
        (publisher_id, offer_id, publisher_offer_id, status, publisher_cpa)
        VALUES ($1, $2, $3, 'HOLD', 0)
        `,
        [publisher.id, picked.offer_id, picked.publisher_offer_id]
      );

      return res.json({
        status: "HOLD",
        message: "Conversion held",
      });
    }

    /* 🔗 INTERNAL PIN SEND */
    const internalUrl = `${INTERNAL_API}/api/pin/send/${picked.offer_id}`;

    const internalResp =
      req.method === "GET"
        ? await axios.get(internalUrl, { params })
        : await axios.post(internalUrl, params);

    const data = internalResp.data;

    /* 🔐 MAP PUBLISHER DATA TO PIN SESSION */
    if (data.session_token) {
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

    /* ✅ CLEAN RESPONSE */
    return res.json({
      ...data,
      publisher_cpa: picked.publisher_cpa,
    });
  } catch (err) {
    if (err.response) {
      console.error("INTERNAL PIN STATUS:", err.response.status);
      console.error("INTERNAL PIN DATA:", err.response.data);
    } else {
      console.error("PUBLISHER PIN SEND ERROR:", err.message);
    }

    return res.status(500).json({
      status: "FAILED",
      message: "Publisher pin send failed",
    });
  }
});

export default router;
