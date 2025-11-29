// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/* ===========================================================
   SHARED CLICK LOG FUNCTION
   - Logs every click into analytics_clicks
=========================================================== */
async function logClick(req, pub_id, offer_id, geo, carrier) {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    await pool.query(
      `
      INSERT INTO analytics_clicks
      (pub_id, offer_id, geo, carrier, ip, ua, referer, params)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        pub_id,
        offer_id,
        geo,
        carrier,
        ip,
        req.headers["user-agent"] || null,
        req.headers["referer"] || null,
        JSON.stringify(req.query || {}),
      ]
    );
  } catch (err) {
    console.error("CLICK LOGGING ERROR:", err);
  }
}

/* ===========================================================
   OPTIONAL: USAGE HELPER (for future caps)
=========================================================== */
async function getOfferUsage(pub_id, offerIds = []) {
  if (!offerIds.length) return {};

  const sql = `
    SELECT 
      offer_id,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS day_count,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') AS hour_count
    FROM analytics_clicks
    WHERE pub_id = $1
      AND offer_id = ANY($2)
    GROUP BY offer_id
  `;

  try {
    const { rows } = await pool.query(sql, [pub_id, offerIds]);
    const map = {};
    for (const r of rows) {
      map[r.offer_id] = {
        day_count: Number(r.day_count || 0),
        hour_count: Number(r.hour_count || 0),
      };
    }
    return map;
  } catch (err) {
    console.error("OFFER USAGE ERROR:", err);
    return {};
  }
}

/* ===========================================================
   FALLBACK: PUBLISHER TRACKING LINK
=========================================================== */
async function redirectFallback(req, res, pub, geo, carrier, click_id) {
  try {
    // 1st try: same geo / carrier
    let fb = await pool.query(
      `
      SELECT tracking_url
      FROM publisher_tracking_links
      WHERE pub_code = $1
        AND (geo IS NULL OR geo='' OR UPPER(geo) = UPPER($2))
        AND (carrier IS NULL OR carrier='' OR UPPER(carrier) = UPPER($3))
      ORDER BY id ASC
      LIMIT 1
      `,
      [pub, geo, carrier]
    );

    let url = fb.rows[0]?.tracking_url;

    // 2nd: any tracking for that pub
    if (!url) {
      fb = await pool.query(
        `
        SELECT tracking_url
        FROM publisher_tracking_links
        WHERE pub_code = $1
        ORDER BY id ASC
        LIMIT 1
        `,
        [pub]
      );
      url = fb.rows[0]?.tracking_url || "https://example.com";
    }

    if (click_id) {
      url += (url.includes("?") ? "&" : "?") + `click_id=${click_id}`;
    }

    await logClick(req, pub, null, geo, carrier);
    return res.redirect(url);
  } catch (e) {
    console.error("FALLBACK ERROR:", e);
    return res.redirect("https://example.com");
  }
}

/* ===========================================================
   MAIN CLICK HANDLER  (NO BROKEN JOINS, STABLE VERSION)
=========================================================== */
async function clickHandler(req, res) {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.redirect("https://example.com");
    }

    const pub = String(pub_id).trim().toUpperCase();
    const geoUp = String(geo).trim().toUpperCase();
    const carrierUp = String(carrier).trim().toUpperCase();

    /* 1) Fetch all active rules for this PUB */
    const rulesRes = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
        AND status = 'active'
      ORDER BY id ASC
      `,
      [pub]
    );

    let rules = rulesRes.rows || [];

    // Normalize geo/carrier
    rules = rules.map((r) => ({
      ...r,
      geo: r.geo ? r.geo.toUpperCase().trim() : "",
      carrier: r.carrier ? r.carrier.toUpperCase().trim() : "",
    }));

    /* 2) If NO RULES → fallback to publisher tracking link */
    if (!rules.length) {
      return await redirectFallback(req, res, pub, geoUp, carrierUp, click_id);
    }

    /* 3) GEO + CARRIER filter */
    const filteredByGeoCarrier = rules.filter((r) => {
      const geos = r.geo ? r.geo.split(",").map((v) => v.trim()) : [];
      const carriers = r.carrier
        ? r.carrier.split(",").map((v) => v.trim())
        : [];

      const geoMatch = !geos.length || geos.includes(geoUp);
      const carrierMatch = !carriers.length || carriers.includes(carrierUp);

      return geoMatch && carrierMatch;
    });

    // If nothing matches exact geo/carrier, fall back to "any rule for pub"
    let candidateRules =
      filteredByGeoCarrier.length > 0 ? filteredByGeoCarrier : rules;

    /* 4) (Future) HARD CAP FILTER
       - Abhi ke liye koi daily/hourly cap nahi; usage sirf placeholder
       - Agar baad me separate cap table banega, yahan add kar denge
    */
    const cappedOfferIds = candidateRules
      .map((r) => Number(r.offer_id))
      .filter(Boolean);

    const usageMap = await getOfferUsage(pub, cappedOfferIds);

    candidateRules = candidateRules.filter((r) => {
      const offerId = Number(r.offer_id);
      if (!offerId) return false;

      // Daily/Hourly cap columns abhi traffic_rules me nahi hain
      // isliye yahan sirf usageMap calculate ho raha hai (debug / future ke liye)
      const _usage = usageMap[offerId] || { day_count: 0, hour_count: 0 };

      return true; // koi cap block nahi
    });

    // After this, agar kisi reason se empty ho gaya, toh fallback
    if (!candidateRules.length) {
      return await redirectFallback(req, res, pub, geoUp, carrierUp, click_id);
    }

    /* 5) WEIGHTED ROTATION among candidateRules */
    const totalWeight = candidateRules.reduce(
      (sum, r) => sum + Number(r.weight || 0),
      0
    );

    if (totalWeight <= 0) {
      // Weight set nahi / galat → direct fallback
      return await redirectFallback(req, res, pub, geoUp, carrierUp, click_id);
    }

    let rnd = Math.random() * totalWeight;
    let selected = candidateRules[0];

    for (const r of candidateRules) {
      rnd -= Number(r.weight || 0);
      if (rnd <= 0) {
        selected = r;
        break;
      }
    }

    /* 6) CLICK LOGGING */
    await logClick(req, pub, selected.offer_id, geoUp, carrierUp);

    /* 7) FINAL REDIRECT URL (with click_id if present) */
    let finalUrl = selected.redirect_url || "";

    if (!finalUrl) {
      // Agar rule me redirect_url empty hua to bhi fallback
      return await redirectFallback(req, res, pub, geoUp, carrierUp, click_id);
    }

    if (click_id) {
      finalUrl +=
        (finalUrl.includes("?") ? "&" : "?") + `click_id=${click_id}`;
    }

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://example.com");
  }
}

/* ===========================================================
   CLICK ROUTES
=========================================================== */

// API route (nginx rewrites /click -> /api/distribution/click)
router.get("/click", fraudCheck, clickHandler);

/* ===========================================================
   META ROUTE
=========================================================== */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT id AS tracking_link_id, pub_code, publisher_id, publisher_name,
             geo, carrier, type, tracking_url, status
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);
  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   OFFERS ROUTE
=========================================================== */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    let q = `
      SELECT id,
             offer_id,
             name AS offer_name,
             advertiser_name,
             type,
             tracking_url,
             status
      FROM offers
      WHERE status = 'active'
    `;

    const params = [];

    if (exclude) {
      const ids = exclude
        .split(",")
        .map((n) => Number(n))
        .filter(Boolean);
      if (ids.length) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
        q += ` AND id NOT IN (${placeholders})`;
        params.push(...ids);
      }
    }

    q += " ORDER BY id ASC";

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   RULES LIST
=========================================================== */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `SELECT * FROM traffic_rules WHERE pub_id=$1 ORDER BY id ASC`;
    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);
  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   REMAINING % (JUST % LOGIC, IGNORING CAP)
=========================================================== */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    let q = `
      SELECT COALESCE(SUM(weight),0) AS sumw
      FROM traffic_rules
      WHERE pub_id=$1 AND status='active'
    `;
    const params = [pub_id];

    if (tracking_link_id) {
      q = `
        SELECT COALESCE(SUM(weight),0) AS sumw
        FROM traffic_rules
        WHERE pub_id=$1 AND tracking_link_id=$2 AND status='active'
      `;
      params.push(tracking_link_id);
    }

    const { rows } = await pool.query(q, params);
    const sumw = Number(rows[0]?.sumw || 0);

    res.json({
      sum: sumw,
      remaining: 100 - sumw,
    });
  } catch (err) {
    console.error("REMAINING ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   OVERVIEW
=========================================================== */
router.get("/overview", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        pub_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_code,
        offer_name,
        advertiser_name,
        redirect_url,
        weight,
        status
      FROM traffic_rules
      ORDER BY pub_id ASC, id ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("OVERVIEW ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   ADD RULE
=========================================================== */
router.post("/rules", async (req, res) => {
  try {
    const b = req.body;

    const required = [
      "pub_id",
      "publisher_id",
      "publisher_name",
      "tracking_link_id",
      "offer_id",
      "offer_code",
      "offer_name",
      "advertiser_name",
      "geo",
      "carrier",
      "weight",
    ];

    for (const key of required) {
      if (!b[key]) return res.status(400).json({ error: `${key}_required` });
    }

    const dup = await pool.query(
      `SELECT id FROM traffic_rules 
       WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3 AND status='active'`,
      [b.pub_id, b.tracking_link_id, b.offer_id]
    );

    if (dup.rows.length)
      return res.status(409).json({ error: "duplicate_offer_for_pub" });

    const q = `
      INSERT INTO traffic_rules (
        pub_id, publisher_id, publisher_name,
        tracking_link_id, geo, carrier,
        offer_id, offer_code, offer_name, advertiser_name,
        redirect_url, type, weight, status,
        created_by, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',$14,NOW())
      RETURNING *
    `;

    const params = [
      b.pub_id,
      b.publisher_id,
      b.publisher_name,
      b.tracking_link_id,
      b.geo,
      b.carrier,
      b.offer_id,
      b.offer_code,
      b.offer_name,
      b.advertiser_name,
      b.redirect_url,
      b.type,
      b.weight,
      b.created_by || 1,
    ];

    const { rows } = await pool.query(q, params);
    res.json(rows[0]);
  } catch (err) {
    console.error("ADD RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   UPDATE RULE
=========================================================== */
router.put("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body;

    const fields = [
      "publisher_id",
      "publisher_name",
      "tracking_link_id",
      "geo",
      "carrier",
      "offer_id",
      "offer_code",
      "offer_name",
      "advertiser_name",
      "redirect_url",
      "type",
      "weight",
      "status",
    ];

    const set = [];
    const values = [];
    let i = 1;

    for (const f of fields) {
      if (b[f] !== undefined) {
        set.push(`${f}=$${i}`);
        values.push(b[f]);
        i++;
      }
    }

    if (!set.length)
      return res.status(400).json({ error: "nothing_to_update" });

    values.push(id);

    const q = `
      UPDATE traffic_rules
      SET ${set.join(", ")}, updated_at=NOW()
      WHERE id=$${values.length}
      RETURNING *
    `;

    const { rows } = await pool.query(q, values);
    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   DELETE RULE
=========================================================== */
router.delete("/rules/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM traffic_rules WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
