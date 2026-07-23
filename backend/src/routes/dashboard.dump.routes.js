import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

router.get("/dashboard/dump", orgAuth, async (req, res) => {
  try {
    const { msisdn, offer_id, publisher_id, advertiser_id, status, from, to, limit = 500, offset = 0 } = req.query;

    let conditions = ["ps.org_id = $1"];
    let params = [req.orgId];
    let idx = 2;

    if (msisdn) { conditions.push(`ps.msisdn ILIKE $${idx++}`); params.push(`%${msisdn}%`); }
    if (offer_id) { conditions.push(`ps.offer_id = $${idx++}`); params.push(offer_id); }
    if (publisher_id) { conditions.push(`ps.publisher_id = $${idx++}`); params.push(publisher_id); }
    if (advertiser_id) { conditions.push(`o.advertiser_id = $${idx++}`); params.push(advertiser_id); }
    if (status) { conditions.push(`ps.status = $${idx++}`); params.push(status); }
    if (from) { conditions.push(`ps.created_at >= ($${idx++}::date) AT TIME ZONE 'Asia/Kolkata'`); params.push(from); }
    if (to) { conditions.push(`ps.created_at < ($${idx++}::date + interval '1 day') AT TIME ZONE 'Asia/Kolkata'`); params.push(to); }

    const where = conditions.join(" AND ");

    const query = `
      SELECT
        ps.session_id,
        ps.parent_session_token,
        o.id AS offer_id,
        o.service_name AS offer_name,
        o.geo,
        o.carrier,
        pub.id AS publisher_id,
        pub.name AS publisher_name,
        adv.id AS advertiser_id,
        adv.name AS advertiser_name,
        ps.msisdn,
        ps.status,
        ps.payout,
        ps.publisher_cpa,
        ps.publisher_credited,
        ps.credited_at,
        ps.publisher_request,
        ps.publisher_response,
        ps.advertiser_request,
        ps.advertiser_response,
        to_char(ps.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD/MM/YYYY, HH12:MI:SS AM') AS created_ist
      FROM pin_sessions ps
      JOIN offers o ON o.id = ps.offer_id
      LEFT JOIN publishers pub ON pub.id = ps.publisher_id
      LEFT JOIN advertisers adv ON adv.id = o.advertiser_id
      WHERE ${where}
      ORDER BY ps.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(Number(limit) > 1000 ? 1000 : Number(limit));
    params.push(Number(offset));

    // Total count for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM pin_sessions ps
      JOIN offers o ON o.id = ps.offer_id
      LEFT JOIN publishers pub ON pub.id = ps.publisher_id
      LEFT JOIN advertisers adv ON adv.id = o.advertiser_id
      WHERE ${where}
    `;
    const countParams = params.slice(0, -2);

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    res.json({
      success: true,
      count: rows.length,
      total: Number(countRows[0].total),
      data: rows,
    });
  } catch (err) {
    console.error("Dump Dashboard Error:", err);
    res.status(500).json({ success: false, message: "Dump dashboard failed" });
  }
});

export default router;
