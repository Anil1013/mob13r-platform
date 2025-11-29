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

    // LOAD RULES
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

    // GEO/CARRIER FILTER
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

    // CAP FILTER
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

    // WEIGHTED ROTATION
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
      if (ids.length) {
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
        q += ` AND id NOT IN (${placeholders})`;
        params.push(...ids);
      }
    }

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   RULE LIST
---------------------------------------- */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM traffic_rules WHERE pub_id=$1 ORDER BY id ASC`,
      [pub_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   REMAINING %
---------------------------------------- */
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
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   OVERVIEW
---------------------------------------- */
router.get("/overview", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        pub_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_name,
        advertiser_name,
        redirect_url,
        weight,
        status
      FROM traffic_rules
      ORDER BY pub_id ASC, id ASC
    `
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   ADD RULE
---------------------------------------- */
router.post("/rules", async (req, res) => {
  try {
    const b = req.body;

    const required = [
      "pub_id",
      "publisher_id",
      "publisher_name",
      "tracking_link_id",
      "offer_id",
      "offer_name",
      "advertiser_name",
      "geo",
      "carrier",
      "redirect_url",
      "type",
      "weight",
    ];

    for (const k of required) {
      if (!b[k]) return res.status(400).json({ error: `${k}_required` });
    }

    const dup = await pool.query(
      `
      SELECT id FROM traffic_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3 AND status='active'
    `,
      [b.pub_id, b.tracking_link_id, b.offer_id]
    );

    if (dup.rows.length)
      return res.status(409).json({ error: "duplicate_offer_for_pub" });

    const q = `
      INSERT INTO traffic_rules (
        pub_id, publisher_id, publisher_name,
        tracking_link_id, geo, carrier,
        offer_id, offer_name, advertiser_name,
        redirect_url, type, weight, status,
        created_by, created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',$13,NOW())
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
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   UPDATE RULE
---------------------------------------- */
router.put("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const b = req.body;

    const existingRes = await pool.query(
      `SELECT * FROM traffic_rules WHERE id=$1`,
      [id]
    );
    const existing = existingRes.rows[0];
    if (!existing)
      return res.status(404).json({ error: "rule_not_found" });

    const fields = [
      "publisher_id",
      "publisher_name",
      "tracking_link_id",
      "geo",
      "carrier",
      "offer_id",
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
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------------
   DELETE RULE
---------------------------------------- */
router.delete("/rules/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM traffic_rules WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
