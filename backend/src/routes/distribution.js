// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/* ===========================================================
   CLICK LOGGING
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
   CAP USAGE FETCH
=========================================================== */
async function getOfferUsage(pub_id, offerIds = []) {
  if (!offerIds.length) return {};

  try {
    const sql = `
      SELECT offer_id,
             COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS day_count,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') AS hour_count
      FROM analytics_clicks
      WHERE pub_id=$1 AND offer_id = ANY($2)
      GROUP BY offer_id
    `;

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
   CLICK HANDLER
=========================================================== */
async function clickHandler(req, res) {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.redirect("https://example.com");
    }

    const pub = String(pub_id).toUpperCase();
    const geoUp = String(geo).toUpperCase();
    const carrierUp = String(carrier).toUpperCase();

    /* Fetch rules + CAP data */
    const rulesRes = await pool.query(
      `
      SELECT tr.*, pod.daily_cap, pod.hourly_cap
      FROM traffic_rules tr
      LEFT JOIN publisher_offer_distribution pod
           ON pod.pub_id = tr.pub_id
          AND pod.offer_id = tr.offer_id
      WHERE tr.pub_id=$1 AND tr.status='active'
    `,
      [pub]
    );

    let rules = rulesRes.rows || [];

    /* If no rules → fallback tracking */
    if (!rules.length) {
      return await redirectFallback(req, res, pub, geoUp, carrierUp, click_id);
    }

    /* GEO/CARRIER FILTER */
    const filtered = rules.filter((r) => {
      const geos = (r.geo || "")
        .toUpperCase()
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const carriers = (r.carrier || "")
        .toUpperCase()
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      const geoMatch = !geos.length || geos.includes(geoUp);
      const carrierMatch = !carriers.length || carriers.includes(carrierUp);

      return geoMatch && carrierMatch;
    });

    let candidateRules = filtered.length ? filtered : rules;

    /* CAP LOGIC */
    const offerCodes = candidateRules.map((r) => r.offer_id);
    const usageMap = await getOfferUsage(pub, offerCodes);

    candidateRules = candidateRules.filter((r) => {
      const usage = usageMap[r.offer_id] || { day_count: 0, hour_count: 0 };
      const dailyCap = Number(r.daily_cap || 0);
      const hourlyCap = Number(r.hourly_cap || 0);

      if (dailyCap > 0 && usage.day_count >= dailyCap) return false;
      if (hourlyCap > 0 && usage.hour_count >= hourlyCap) return false;

      return true;
    });

    if (!candidateRules.length) {
      return await redirectFallback(req, res, pub, geoUp, carrierUp, click_id);
    }

    /* WEIGHT ROTATION */
    const totalWeight = candidateRules.reduce(
      (s, r) => s + Number(r.weight || 0),
      0
    );

    if (totalWeight <= 0) {
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

    /* LOG CLICK */
    await logClick(req, pub, selected.offer_id, geoUp, carrierUp);

    /* REDIRECT */
    let finalUrl = selected.redirect_url || "https://example.com";
    finalUrl += finalUrl.includes("?")
      ? `&click_id=${click_id}`
      : `?click_id=${click_id}`;

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://example.com");
  }
}

/* ===========================================================
   FALLBACK REDIRECT
=========================================================== */
async function redirectFallback(req, res, pub, geo, carrier, click_id) {
  try {
    const specific = await pool.query(
      `
      SELECT tracking_url
      FROM publisher_tracking_links
      WHERE pub_code=$1
        AND (geo='' OR geo IS NULL OR UPPER(geo)=UPPER($2))
        AND (carrier='' OR carrier IS NULL OR UPPER(carrier)=UPPER($3))
      ORDER BY id ASC
      LIMIT 1
    `,
      [pub, geo, carrier]
    );

    let url =
      specific.rows[0]?.tracking_url ||
      (
        await pool.query(
          `
        SELECT tracking_url
        FROM publisher_tracking_links
        WHERE pub_code=$1
        ORDER BY id ASC LIMIT 1
      `,
          [pub]
        )
      ).rows[0]?.tracking_url ||
      "https://example.com";

    url += url.includes("?")
      ? `&click_id=${click_id}`
      : `?click_id=${click_id}`;

    await logClick(req, pub, null, geo, carrier);
    return res.redirect(url);
  } catch (err) {
    console.error("FB ERROR:", err);
    return res.redirect("https://example.com");
  }
}

/* ===========================================================
   ROUTES
=========================================================== */
router.get("/click", fraudCheck, clickHandler);

/* META for tracking links */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;
    const { rows } = await pool.query(
      `
      SELECT id AS tracking_link_id, pub_code, publisher_id, publisher_name,
             geo, carrier, type, tracking_url, status
      FROM publisher_tracking_links
      WHERE pub_code=$1
      ORDER BY id ASC
    `,
      [pub_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* LOAD OFFERS */
router.get("/offers", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, offer_id, name AS offer_name,
             advertiser_name, type, tracking_url, status
      FROM offers
      WHERE status='active'
      ORDER BY id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("OFFERS ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* LOAD RULES */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM traffic_rules WHERE pub_id=$1 ORDER BY id ASC`,
      [pub_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* REMAINING WEIGHT CHECK */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const { rows } = await pool.query(
      `
      SELECT COALESCE(SUM(weight),0) AS sumw
      FROM traffic_rules
      WHERE pub_id=$1 AND status='active'
    `,
      [pub_id]
    );

    const sumw = Number(rows[0]?.sumw || 0);

    res.json({
      total: sumw,
      remaining: 100 - sumw,
    });
  } catch (err) {
    console.error("REMAINING ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   ADD RULE
=========================================================== */
router.post("/rules", async (req, res) => {
  try {
    const b = req.body;

    const q = `
      INSERT INTO traffic_rules (
        pub_id, publisher_id, publisher_name,
        tracking_link_id, geo, carrier,
        offer_id, offer_code, offer_name,
        advertiser_name, redirect_url,
        type, weight, status, created_by, created_at
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
      b.offer_id,        // ALWAYS OFFxx VALID
      b.offer_code,      // ALWAYS OFFxx VALID
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
