import express from "express";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";
import axios from "axios";

const router = express.Router();

/* ================= WEIGHTED PICK ================= */
function pickOfferByWeight(rows) {
  const total = rows.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * total;

  for (const r of rows) {
    if (rand < r.weight) return r;
    rand -= r.weight;
  }
}

/* =====================================================
   🔐 PUBLISHER PIN SEND (GET / POST)
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
      SELECT po.*, o.*
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

    /* 🎯 PICK OFFER BY WEIGHT */
    const picked = pickOfferByWeight(offersRes.rows);

    /* 🔁 PASS % HOLD LOGIC */
    const passRand = Math.random() * 100;
    if (passRand > picked.pass_percent) {
      return res.json({
        status: "HOLD",
        message: "Conversion held by pass_percent rule",
      });
    }

    /* 🔗 INTERNAL PIN SEND */
    const internalResp = await axios.get(
      `http://localhost:3000/api/pin/send/${picked.offer_id}`,
      { params }
    );

    /* 🔐 SAVE PUBLISHER MAPPING */
    if (internalResp.data.session_token) {
      await pool.query(
        `
        UPDATE pin_sessions
        SET publisher_id = $1,
            publisher_cpa = $2
        WHERE session_token = $3
        `,
        [
          publisher.id,
          picked.publisher_cpa,
          internalResp.data.session_token,
        ]
      );
    }

    return res.json({
      ...internalResp.data,
      publisher: publisher.name,
      routed_offer_id: picked.offer_id,
    });
  } catch (err) {
    console.error("PUBLISHER PIN SEND ERROR:", err.message);
    return res.status(500).json({
      status: "FAILED",
      message: "Publisher pin send failed",
    });
  }
});

export default router;
