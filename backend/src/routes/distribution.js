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
  } catch (_) {}
}

/* ---------------------------------------
   OFFER CAP COUNTS
---------------------------------------- */
async function getUsage(pub, offerIds) {
  if (!offerIds.length) return {};

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
}

/* ---------------------------------------
   FALLBACK URL
---------------------------------------- */
async function getFallback(pub, geo, carrier) {
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
}

/* ---------------------------------------
   CLICK HANDLER
---------------------------------------- */
async function clickHandler(req, res) {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier)
      return res.redirect("https://example.com");

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

    if (!rules.length) {
      let fb = await getFallback(pub, g, c);
      if (click_id)
        fb += (fb.includes("?") ? "&" : "?") + `click_id=${click_id}`;
      await logClick(req, pub, null, g, c);
      return res.redirect(fb);
    }

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

    if (!filtered.length) {
      let fb = await getFallback(pub, g, c);
      if (click_id)
        fb += (fb.includes("?") ? "&" : "?") + `click_id=${click_id}`;
      await logClick(req, pub, null, g, c);
      return res.redirect(fb);
    }

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
    if (click_id)
      url += (url.includes("?") ? "&" : "?") + `click_id=${click_id}`;

    return res.redirect(url);
  } catch (err) {
    console.log("CLICK ERROR:", err);
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
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   OFFERS
---------------------------------------- */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    let q = `
      SELECT 
        id,
        offer_id,
        name AS offer_name,
        advertiser_name,
        type,
        tracking_url
      FROM offers
      WHERE status='active'
    `;

    const params = [];

    if (exclude) {
      const ids = exclude.split(",").map(Number).filter(Boolean);
      params.push(ids);
      q += ` AND offer_id NOT IN (SELECT UNNEST($1::int[]))`;
    }

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
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
    console.log("RULE UPDATE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   REMAINING COUNTS
---------------------------------------- */
router.get("/rules/remaining", async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

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

    const offerIds = rows.map((r) => r.offer_id);
    const usage = await getUsage(pub_id, offerIds);

    const response = rows.map((r) => {
      const u = usage[r.offer_id] || { day: 0, hour: 0 };
      return {
        offer_id: r.offer_id,
        day_remaining: (r.daily_cap || 0) - u.day,
        hour_remaining: (r.hourly_cap || 0) - u.hour,
      };
    });

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   EXPORT
---------------------------------------- */
export default router;
