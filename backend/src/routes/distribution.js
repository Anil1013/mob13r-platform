// backend/src/routes/distribution.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

/* =========================================================
   HELPERS
========================================================= */

// weight based selection from traffic_rules rows
const pickByWeight = (rules) => {
  const bucket = [];
  for (const r of rules) {
    const w = Number(r.weight || 0);
    for (let i = 0; i < w; i++) {
      bucket.push(r);
    }
  }
  if (!bucket.length) return null;
  const idx = Math.floor(Math.random() * bucket.length);
  return bucket[idx];
};

/* =========================================================
   1) OVERVIEW  (frontend: GET /distribution/overview)
========================================================= */
// frontend expects: r.data is ARRAY directly
// and each row has: pub_id, publisher_name, offer_code, offer_name,
// advertiser_name, geo, carrier, weight, id
router.get("/overview", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        id,
        pub_id,
        publisher_name,
        offer_code,
        offer_name,
        advertiser_name,
        geo,
        carrier,
        weight
      FROM traffic_rules
      WHERE status = 'active'
      ORDER BY pub_id, geo, carrier, id
      `
    );

    return res.json(rows); // plain array
  } catch (err) {
    console.error("overview error:", err);
    return res.status(500).json({ message: "Overview failed" });
  }
});

/* =========================================================
   2) META  (frontend: GET /distribution/meta?pub_id=PUB03)
========================================================= */
// frontend expects array of rows with:
// tracking_link_id, pub_code, publisher_id, publisher_name,
// geo, carrier, type, tracking_url
router.get("/meta", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) {
      return res.status(400).json({ message: "pub_id is required" });
    }

    const { rows } = await pool.query(
      `
      SELECT DISTINCT
        tracking_link_id,
        pub_id AS pub_code,
        publisher_id,
        publisher_name,
        geo,
        carrier,
        type,
        redirect_url AS tracking_url
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY tracking_link_id
      `,
      [pub_id]
    );

    return res.json(rows); // plain array
  } catch (err) {
    console.error("meta error:", err);
    return res.status(500).json({ message: "Meta failed" });
  }
});

/* =========================================================
   3) RULES LIST  (frontend: GET /distribution/rules?pub_id=PUB03)
========================================================= */
// frontend expects array of traffic_rules rows with fields:
// id, pub_id, tracking_link_id, geo, carrier, offer_id, offer_code,
// offer_name, advertiser_name, redirect_url, type, weight, etc.
router.get("/rules", async (req, res) => {
  try {
    const { pub_id } = req.query;
    if (!pub_id) {
      return res.status(400).json({ message: "pub_id is required" });
    }

    const { rows } = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY tracking_link_id, id
      `,
      [pub_id]
    );

    return res.json(rows);
  } catch (err) {
    console.error("rules list error:", err);
    return res.status(500).json({ message: "Rules fetch failed" });
  }
});

/* =========================================================
   4) REMAINING % (frontend: /distribution/rules/remaining)
   ?pub_id=PUB03&tracking_link_id=3
========================================================= */
router.get("/rules/remaining", async (req, res) => {
  try:
    const { pub_id, tracking_link_id } = req.query;

    if (!pub_id) {
      return res.json({ remaining: 100 });
    }

    let query = `
      SELECT COALESCE(SUM(weight), 0) AS used
      FROM traffic_rules
      WHERE pub_id = $1
        AND status = 'active'
    `;
    const params = [pub_id];

    if (tracking_link_id) {
      query += ` AND tracking_link_id = $2`;
      params.push(Number(tracking_link_id));
    }

    const { rows } = await pool.query(query, params);
    const used = Number(rows[0]?.used || 0);
    let remaining = 100 - used;
    if (remaining < 0) remaining = 0;
    if (remaining > 100) remaining = 100;

    return res.json({ remaining });
  } catch (err) {
    console.error("remaining error:", err);
    return res.json({ remaining: 100 });
  }
});

/* =========================================================
   5) OFFERS LIST (frontend: /distribution/offers?geo=&carrier=&exclude=)
========================================================= */
// frontend expects array of offers with:
// id, offer_id, offer_name, advertiser_name, tracking_url, type
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    // optional exclude list (comma-separated IDs)
    let excludeIds = [];
    if (exclude) {
      excludeIds = exclude
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((x) => !Number.isNaN(x));
    }

    let sql = `
      SELECT 
        id,
        offer_id,
        offer_name,
        advertiser_name,
        tracking_url,
        type
      FROM offers
      WHERE status = 'active'
    `;
    const params = [];

    if (excludeIds.length) {
      sql += ` AND NOT (id = ANY($1))`;
      params.push(excludeIds);
    }

    sql += ` ORDER BY id DESC`;

    const { rows } = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error("offers error:", err);
    return res.status(500).json({ message: "Offers fetch failed" });
  }
});

/* =========================================================
   6) CREATE RULE  (frontend: POST /distribution/rules)
========================================================= */
// payload fields from frontend:
// pub_id, publisher_id, publisher_name,
// tracking_link_id, geo, carrier,
// offer_id, offer_code, offer_name, advertiser_name,
// redirect_url, type, weight, created_by
router.post("/rules", async (req, res) => {
  try {
    const {
      pub_id,
      publisher_id,
      publisher_name,
      tracking_link_id,
      geo,
      carrier,
      offer_id,
      offer_code,
      offer_name,
      advertiser_name,
      redirect_url,
      type,
      weight,
      created_by,
    } = req.body;

    if (!pub_id || !tracking_link_id || !offer_id || !weight) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // prevent duplicate rule for same pub + tracking + offer
    const dupCheck = await pool.query(
      `
      SELECT id 
      FROM traffic_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
        AND offer_id = $3
      `,
      [pub_id, tracking_link_id, offer_id]
    );

    if (dupCheck.rows.length) {
      return res.status(409).json({ message: "Rule already exists" });
    }

    // optional: enforce max 100% per tracking_link
    const weightResult = await pool.query(
      `
      SELECT COALESCE(SUM(weight), 0) AS used
      FROM traffic_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
        AND status = 'active'
      `,
      [pub_id, tracking_link_id]
    );

    const alreadyUsed = Number(weightResult.rows[0]?.used || 0);
    if (alreadyUsed + Number(weight) > 100) {
      return res
        .status(400)
        .json({ message: "Weight exceeds 100% for this tracking link" });
    }

    const insert = await pool.query(
      `
      INSERT INTO traffic_rules (
        pub_id,
        publisher_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_code,
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status,
        created_by
      )
      VALUES (
        $1, $2, $3,
        $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13,
        'active', $14
      )
      RETURNING *
      `,
      [
        pub_id,
        publisher_id || null,
        publisher_name || null,
        tracking_link_id,
        geo || null,
        carrier || null,
        offer_id,
        offer_code || null,
        offer_name || null,
        advertiser_name || null,
        redirect_url || null,
        type || null,
        weight,
        created_by || null,
      ]
    );

    return res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error("create rule error:", err);
    // this is the error you saw earlier: null tracking_link_id violates NOT NULL
    return res.status(500).json({ message: "Create rule failed" });
  }
});

/* =========================================================
   7) UPDATE RULE (frontend: PUT /distribution/rules/:id)
========================================================= */
router.put("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pub_id,
      publisher_id,
      publisher_name,
      tracking_link_id,
      geo,
      carrier,
      offer_id,
      offer_code,
      offer_name,
      advertiser_name,
      redirect_url,
      type,
      weight,
    } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Missing id" });
    }

    const update = await pool.query(
      `
      UPDATE traffic_rules
      SET
        pub_id = $1,
        publisher_id = $2,
        publisher_name = $3,
        tracking_link_id = $4,
        geo = $5,
        carrier = $6,
        offer_id = $7,
        offer_code = $8,
        offer_name = $9,
        advertiser_name = $10,
        redirect_url = $11,
        type = $12,
        weight = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
      `,
      [
        pub_id,
        publisher_id || null,
        publisher_name || null,
        tracking_link_id,
        geo || null,
        carrier || null,
        offer_id,
        offer_code || null,
        offer_name || null,
        advertiser_name || null,
        redirect_url || null,
        type || null,
        weight,
        id,
      ]
    );

    return res.json(update.rows[0]);
  } catch (err) {
    console.error("update rule error:", err);
    return res.status(500).json({ message: "Update rule failed" });
  }
});

/* =========================================================
   8) DELETE RULE (frontend: DELETE /distribution/rules/:id)
========================================================= */
router.delete("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Missing id" });

    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [id]);

    return res.json({ message: "Rule deleted" });
  } catch (err) {
    console.error("delete rule error:", err);
    return res.status(500).json({ message: "Delete rule failed" });
  }
});

/* =========================================================
   9) CLICK REDIRECT ENGINE
   /api/distribution/click?pub_id=PUB03&geo=BD&carrier=Robi&click_id=...
   (server.js: /click -> /api/distribution/click)
========================================================= */
router.get("/click", async (req, res) => {
  try {
    const { pub_id, geo, carrier, click_id } = req.query;

    if (!pub_id || !geo || !carrier) {
      return res.redirect("https://google.com");
    }

    const { rows: rules } = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
        AND geo = $2
        AND carrier = $3
        AND status = 'active'
      `,
      [pub_id, geo, carrier]
    );

    if (!rules.length) {
      return res.redirect("https://google.com");
    }

    const chosen = pickByWeight(rules) || rules[0];
    let finalUrl = chosen.redirect_url || "https://google.com";

    if (click_id && typeof finalUrl === "string") {
      if (finalUrl.includes("{click_id}")) {
        finalUrl = finalUrl.replace("{click_id}", encodeURIComponent(click_id));
      } else {
        const sep = finalUrl.includes("?") ? "&" : "?";
        finalUrl = `${finalUrl}${sep}click_id=${encodeURIComponent(click_id)}`;
      }
    }

    // non-blocking analytics insert (ignore errors)
    try {
      await pool.query(
        `
        INSERT INTO analytics_clicks (partner_id, ip, user_agent, redirect_url)
        VALUES ($1, $2, $3, $4)
        `,
        [
          chosen.offer_id || null,
          req.ip,
          req.headers["user-agent"] || "",
          finalUrl,
        ]
      );
    } catch (e) {
      console.warn("analytics_clicks insert failed:", e.message);
    }

    return res.redirect(finalUrl);
  } catch (err) {
    console.error("click redirect error:", err);
    return res.redirect("https://google.com");
  }
});

/* =========================================================
   EXPORT
========================================================= */
export default router;
