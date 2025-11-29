import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/* ---------------------------------------
   CLICK LOG
---------------------------------------- */
async function logClick(req, pub, offer, geo, carrier) {
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
        pub,
        offer,
        geo,
        carrier,
        ip,
        req.headers["user-agent"] || null,
        req.headers["referer"] || null,
        JSON.stringify(req.query || {}),
      ]
    );
  } catch (err) {
    console.error("logClick error:", err.message);
  }
}

/* ---------------------------------------
   OFFER CAP COUNTS
---------------------------------------- */
async function getUsage(pub, offerIds) {
  try {
    if (!offerIds || !offerIds.length) return {};

    const q = `
      SELECT 
        offer_id,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS day_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') AS hour_count
      FROM analytics_clicks
      WHERE pub_id = $1 AND offer_id = ANY($2)
      GROUP BY offer_id
    `;

    const { rows } = await pool.query(q, [pub, offerIds]);
    const out = {};
    rows.forEach((r) => {
      out[r.offer_id] = {
        day: Number(r.day_count || 0),
        hour: Number(r.hour_count || 0),
      };
    });

    return out;
  } catch (err) {
    console.error("getUsage error:", err.message);
    return {};
  }
}

/* ---------------------------------------
   FALLBACK URL
---------------------------------------- */
async function getFallback(pub, geo, carrier) {
  try {
    const q1 = await pool.query(
      `
      SELECT tracking_url 
      FROM publisher_tracking_links
      WHERE pub_code = $1
        AND (geo IS NULL OR geo='' OR UPPER(geo)=UPPER($2))
        AND (carrier IS NULL OR carrier='' OR UPPER(carrier)=UPPER($3))
      ORDER BY id ASC LIMIT 1
    `,
      [pub, geo, carrier]
    );

    if (q1.rows.length) return q1.rows[0].tracking_url;

    const q2 = await pool.query(
      `
      SELECT tracking_url 
      FROM publisher_tracking_links
      WHERE pub_code = $1
      ORDER BY id ASC LIMIT 1
    `,
      [pub]
    );

    return q2.rows[0]?.tracking_url || "https://example.com";
  } catch (err) {
    console.error("getFallback error:", err.message);
    return "https://example.com";
  }
}

/* ---------------------------------------
   CLICK HANDLER
---------------------------------------- */
async function clickHandler(req, res) {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.redirect("https://example.com");
    }

    const pub = pub_id.toUpperCase();
    const g = geo.toUpperCase();
    const c = carrier.toUpperCase();

    const { rows: rules } = await pool.query(
      `
      SELECT 
        tr.*,
        pod.daily_cap,
        pod.hourly_cap
      FROM traffic_rules tr
      LEFT JOIN publisher_offer_distribution pod
        ON pod.pub_id = tr.pub_id AND pod.offer_id = tr.offer_id
      WHERE tr.pub_id = $1 AND tr.status='active'
    `,
      [pub]
    );

    // No rules → fallback
    if (!rules.length) {
      let fb = await getFallback(pub, g, c);
      if (click_id) {
        fb += (fb.includes("?") ? "&" : "?") + `click_id=${click_id}`;
      }
      await logClick(req, pub, null, g, c);
      return res.redirect(fb);
    }

    // GEO / Carrier filter
    let filtered = rules.filter((r) => {
      const geos = (r.geo || "")
        .toUpperCase()
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const carr = (r.carrier || "")
        .toUpperCase()
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      const gm = !geos.length || geos.includes(g);
      const cm = !carr.length || carr.includes(c);
      return gm && cm;
    });

    if (!filtered.length) filtered = rules;

    // Cap check
    const offerIds = filtered.map((r) => Number(r.offer_id));
    const usage = await getUsage(pub, offerIds);

    filtered = filtered.filter((r) => {
      const u = usage[r.offer_id] || { day: 0, hour: 0 };
      const d = Number(r.daily_cap || 0);
      const h = Number(r.hourly_cap || 0);

      if (d > 0 && u.day >= d) return false;
      if (h > 0 && u.hour >= h) return false;
      return true;
    });

    // All capped → fallback
    if (!filtered.length) {
      let fb = await getFallback(pub, g, c);
      if (click_id) {
        fb += (fb.includes("?") ? "&" : "?") + `click_id=${click_id}`;
      }
      await logClick(req, pub, null, g, c);
      return res.redirect(fb);
    }

    // Weighted random
    const total = filtered.reduce((s, r) => s + Number(r.weight || 0), 0);
    let rnd = Math.random() * total;
    let selected = filtered[0];

    for (const r of filtered) {
      rnd -= Number(r.weight || 0);
      if (rnd <= 0) {
        selected = r;
        break;
      }
    }

    await logClick(req, pub, selected.offer_id, g, c);

    let url = selected.redirect_url || "https://example.com";
    if (click_id) {
      url += (url.includes("?") ? "&" : "?") + `click_id=${click_id}`;
    }

    return res.redirect(url);
  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://example.com");
  }
}

router.get("/click", fraudCheck, clickHandler);

/* ---------------------------------------
   META
---------------------------------------- */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const { rows } = await pool.query(
      `
      SELECT 
        id AS tracking_link_id,
        pub_code,
        publisher_id,
        publisher_name,
        geo,
        carrier
      FROM publisher_tracking_links
      WHERE pub_code=$1
      ORDER BY id ASC
    `,
      [pub_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("META ERROR:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   OFFERS  (FIXED 500)
---------------------------------------- */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    let q = `
      SELECT 
        id,
        id AS offer_id,          -- rules.offer_id usually references this
        name AS offer_name,
        advertiser_name,
        type,
        tracking_url
      FROM offers
      WHERE status='active'
    `;

    const params = [];

    // If exclude is present, filter by id
    if (exclude) {
      const ids = exclude
        .split(",")
        .map((v) => parseInt(v, 10))
        .filter((v) => !Number.isNaN(v));

      if (ids.length) {
        params.push(ids);
        q += ` AND id != ALL($1::int[])`;
      }
    }

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("OFFERS ERROR:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   RULES LIST
---------------------------------------- */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const { rows } = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id=$1
      ORDER BY id ASC
    `,
      [pub_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("RULES LIST ERROR:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   RULES UPDATE
---------------------------------------- */
router.put("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      geo,
      carrier,
      offer_id,
      weight,
      redirect_url,
      status,
      daily_cap,
      hourly_cap,
    } = req.body;

    const q = `
      UPDATE traffic_rules
      SET geo=$1, carrier=$2, offer_id=$3, weight=$4, redirect_url=$5,
          status=$6, daily_cap=$7, hourly_cap=$8
      WHERE id=$9
      RETURNING *
    `;

    const { rows } = await pool.query(q, [
      geo,
      carrier,
      offer_id,
      weight,
      redirect_url,
      status,
      daily_cap,
      hourly_cap,
      id,
    ]);

    res.json(rows[0]);
  } catch (err) {
    console.error("RULE UPDATE ERROR:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   REMAINING COUNTS (FIXED 500)
---------------------------------------- */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const { rows } = await pool.query(
      `
      SELECT 
        tr.offer_id,
        tr.daily_cap,
        tr.hourly_cap
      FROM traffic_rules tr
      WHERE tr.pub_id=$1
    `,
      [pub_id]
    );

    const offerIds = rows.map((r) => Number(r.offer_id)).filter(Boolean);
    const usage = await getUsage(pub_id, offerIds);

    const response = rows.map((r) => {
      const u = usage[r.offer_id] || { day: 0, hour: 0 };
      const dayCap = Number(r.daily_cap || 0);
      const hourCap = Number(r.hourly_cap || 0);

      return {
        offer_id: r.offer_id,
        day_remaining: dayCap > 0 ? dayCap - u.day : null,
        hour_remaining: hourCap > 0 ? hourCap - u.hour : null,
      };
    });

    res.json(response);
  } catch (err) {
    console.error("REMAINING ERROR:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   EXPORT
---------------------------------------- */
export default router;
