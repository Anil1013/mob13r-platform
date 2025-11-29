import express from "express";
import pool from "../db.js";
import fraudCheck from "../middleware/fraudCheck.js";

const router = express.Router();

/* ===========================================================
   CLICK LOG
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
    console.error("CLICK LOG ERROR:", err);
  }
}

/* ===========================================================
   OFFER USAGE (CAP)
=========================================================== */
async function getOfferUsage(pub_id, offerIds = []) {
  if (!offerIds.length) return {};

  const sql = `
    SELECT 
      offer_id,
      COUNT(*) AS total_count,
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
      map[Number(r.offer_id)] = {
        total_count: Number(r.total_count || 0),
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
   FALLBACK URL
=========================================================== */
async function getPublisherFallbackUrl(pub, geoUp, carrierUp) {
  // Try exact geo + carrier match
  const specific = await pool.query(
    `
      SELECT tracking_url
      FROM publisher_tracking_links
      WHERE pub_code=$1
        AND (geo IS NULL OR geo='' OR UPPER(geo)=UPPER($2))
        AND (carrier IS NULL OR carrier='' OR UPPER(carrier)=UPPER($3))
        AND status='active'
      ORDER BY id ASC
      LIMIT 1
    `,
    [pub, geoUp, carrierUp]
  );

  if (specific.rows.length) return specific.rows[0].tracking_url;

  // Try any active link
  const anyRow = await pool.query(
    `
      SELECT tracking_url
      FROM publisher_tracking_links
      WHERE pub_code=$1 AND status='active'
      ORDER BY id ASC
      LIMIT 1
    `,
    [pub]
  );

  return anyRow.rows[0]?.tracking_url || "https://example.com";
}

/* ===========================================================
   MAIN CLICK HANDLER
=========================================================== */
async function clickHandler(req, res) {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier)
      return res.redirect("https://example.com");

    const pub = pub_id.toUpperCase();
    const geoUp = geo.toUpperCase();
    const carrierUp = carrier.toUpperCase();

    /* 1) Load Rules + Caps */
    const rulesRes = await pool.query(
      `
        SELECT 
          tr.*,
          pod.daily_cap AS pod_daily_cap,
          pod.hourly_cap AS pod_hourly_cap,
          o.cap_daily AS offer_cap_daily,
          o.cap_total AS offer_cap_total
        FROM traffic_rules tr
        LEFT JOIN publisher_offer_distribution pod
          ON pod.pub_id=tr.pub_id AND pod.offer_id=tr.offer_id
        LEFT JOIN offers o
          ON o.id = tr.offer_id
        WHERE tr.pub_id=$1 AND tr.status='active'
      `,
      [pub]
    );

    let rules = rulesRes.rows || [];

    /* 2) No Rules → fallback */
    if (!rules.length) {
      let fb = await getPublisherFallbackUrl(pub, geoUp, carrierUp);
      if (click_id)
        fb += (fb.includes("?") ? "&" : "?") + `click_id=${click_id}`;
      await logClick(req, pub, null, geoUp, carrierUp);
      return res.redirect(fb);
    }

    /* 3) GEO + CARRIER match */
    const geoCarrierMatched = rules.filter((r) => {
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

    let candidate = geoCarrierMatched.length ? geoCarrierMatched : rules;

    /* 4) HARD CAP FILTER */
    const offerIds = candidate.map((r) => Number(r.offer_id));
    const usage = await getOfferUsage(pub, offerIds);

    candidate = candidate.filter((r) => {
      const oid = Number(r.offer_id);
      const u = usage[oid] || {
        total_count: 0,
        day_count: 0,
        hour_count: 0,
      };

      const podDaily = Number(r.pod_daily_cap || 0);
      const podHourly = Number(r.pod_hourly_cap || 0);

      const oDaily = Number(r.offer_cap_daily || 0);
      const oTotal = Number(r.offer_cap_total || 0);

      if (podDaily > 0 && u.day_count >= podDaily) return false;
      if (podHourly > 0 && u.hour_count >= podHourly) return false;

      if (oDaily > 0 && u.day_count >= oDaily) return false;
      if (oTotal > 0 && u.total_count >= oTotal) return false;

      return true;
    });

    // No candidates → fallback
    if (!candidate.length) {
      let fb = await getPublisherFallbackUrl(pub, geoUp, carrierUp);
      if (click_id)
        fb += (fb.includes("?") ? "&" : "?") + `click_id=${click_id}`;
      await logClick(req, pub, null, geoUp, carrierUp);
      return res.redirect(fb);
    }

    /* 5) Weighted Rotation */
    const totalW = candidate.reduce(
      (s, r) => s + Number(r.weight || 0),
      0
    );

    if (totalW <= 0) {
      let fb = await getPublisherFallbackUrl(pub, geoUp, carrierUp);
      if (click_id)
        fb += (fb.includes("?") ? "&" : "?") + `click_id=${click_id}`;
      await logClick(req, pub, null, geoUp, carrierUp);
      return res.redirect(fb);
    }

    let rnd = Math.random() * totalW;
    let selected = candidate[0];

    for (const r of candidate) {
      rnd -= Number(r.weight || 0);
      if (rnd <= 0) {
        selected = r;
        break;
      }
    }

    /* 6) Log Click */
    await logClick(req, pub, selected.offer_id, geoUp, carrierUp);

    /* 7) Redirect */
    let final = selected.redirect_url;
    if (!final) {
      const off = await pool.query(
        `SELECT tracking_url FROM offers WHERE id=$1 LIMIT 1`,
        [selected.offer_id]
      );
      final = off.rows[0]?.tracking_url || "https://example.com";
    }

    if (click_id)
      final += (final.includes("?") ? "&" : "?") + `click_id=${click_id}`;

    return res.redirect(final);
  } catch (err) {
    console.error("CLICK ERROR:", err);
    return res.redirect("https://example.com");
  }
}

/* ===========================================================
   CLICK ROUTE
=========================================================== */
router.get("/click", fraudCheck, clickHandler);

/* ===========================================================
   META
=========================================================== */
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT id AS tracking_link_id,
             pub_code,
             publisher_id,
             publisher_name,
             geo,
             carrier,
             type,
             tracking_url,
             status
      FROM publisher_tracking_links
      WHERE pub_code=$1
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
   OFFERS
=========================================================== */
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
        tracking_url,
        status
      FROM offers
      WHERE status='active'
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
   RULES
=========================================================== */
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id=$1
      ORDER BY id ASC
    `;

    const { rows } = await pool.query(q, [pub_id]);
    res.json(rows);
  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ===========================================================
   REMAINING %
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

    res.json({
      sum: Number(rows[0]?.sumw || 0),
      remaining: 100 - Number(rows[0]?.sumw || 0),
    });
  } catch (err) {
    console.error("REMAINING % ERROR:", err);
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
   ADD RULE (offer_code removed completely)
=========================================================== */
router.post("/rules", async (req, res) => {
  try {
    const b = req.body;

    // Required fields
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

    for (const key of required) {
      if (!b[key]) return res.status(400).json({ error: `${key}_required` });
    }

    // Prevent duplicate
    const dup = await pool.query(
      `
      SELECT id FROM traffic_rules
      WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3 AND status='active'
      `,
      [b.pub_id, b.tracking_link_id, b.offer_id]
    );

    if (dup.rows.length)
      return res.status(409).json({ error: "duplicate_offer_for_pub" });

    // Weight check
    const wRow = await pool.query(
      `
      SELECT COALESCE(SUM(weight),0) AS sumw
      FROM traffic_rules
      WHERE pub_id=$1
        AND tracking_link_id=$2
        AND geo=$3
        AND carrier=$4
        AND status='active'
      `,
      [b.pub_id, b.tracking_link_id, b.geo, b.carrier]
    );

    const currentW = Number(wRow.rows[0]?.sumw || 0);
    const newTotal = currentW + Number(b.weight);

    if (newTotal > 100) {
      return res.status(400).json({
        error: "weight_limit_exceeded",
        current: currentW,
        attempted: newTotal,
      });
    }

    // Insert
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
    let index = 1;

    for (const f of fields) {
      if (b[f] !== undefined) {
        set.push(`${f}=$${index}`);
        values.push(b[f]);
        index++;
      }
    }

    if (!set.length)
      return res.status(400).json({ error: "nothing_to_update" });

    const newWeight =
      b.weight !== undefined ? Number(b.weight) : Number(existing.weight);

    const wRow = await pool.query(
      `
      SELECT COALESCE(SUM(weight),0) AS sumw
      FROM traffic_rules
      WHERE pub_id=$1
        AND tracking_link_id=$2
        AND geo=$3
        AND carrier=$4
        AND status='active'
        AND id<>$5
      `,
      [
        existing.pub_id,
        existing.tracking_link_id,
        existing.geo,
        existing.carrier,
        id,
      ]
    );

    const currentW = Number(wRow.rows[0]?.sumw || 0);
    const newTotal = currentW + newWeight;

    if (newTotal > 100) {
      return res.status(400).json({
        error: "weight_limit_exceeded",
        current: currentW,
        attempted: newTotal,
      });
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
    await pool.query(`DELETE FROM traffic_rules WHERE id=$1`, [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
