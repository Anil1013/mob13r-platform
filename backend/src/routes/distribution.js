import express from "express";
import pool from "../db.js";

const router = express.Router();

/* ------------------------------------------------------------
   Utility: Convert PUB03 → 3
------------------------------------------------------------ */
const normalizePub = (pub) => {
  if (!pub) return null;
  return pub.toString().replace(/\D+/g, "");
};

/* ------------------------------------------------------------
   GET: Global Overview (traffic_rules table)
------------------------------------------------------------ */
router.get("/overview", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
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
        weight
      FROM traffic_rules
      ORDER BY pub_id ASC, id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("GET /api/distribution/overview:", err);
    res.status(500).json({ error: "Failed to load overview" });
  }
});

/* ------------------------------------------------------------
   GET: META (publisher tracking links)
------------------------------------------------------------ */
router.get("/meta", async (req, res) => {
  try {
    let { pub_id } = req.query;
    pub_id = normalizePub(pub_id);

    const query = `
      SELECT
        tl.id AS tracking_link_id,
        p.pub_code,
        p.id AS publisher_id,
        p.name AS publisher_name,
        tl.geo,
        tl.carrier,
        tl.type,
        tl.tracking_url
      FROM publisher_tracking_links tl
      JOIN publishers p ON p.id = tl.publisher_id
      WHERE p.pub_code = $1
      ORDER BY tl.id ASC
    `;

    const { rows } = await pool.query(query, [`PUB${pub_id}`]);

    res.json(rows);
  } catch (err) {
    console.error("GET /api/distribution/meta:", err);
    res.status(500).json({ error: "Failed to load meta" });
  }
});

/* ------------------------------------------------------------
   GET: RULES (traffic_rules)
------------------------------------------------------------ */
router.get("/rules", async (req, res) => {
  try {
    let { pub_id } = req.query;
    pub_id = normalizePub(pub_id);

    const { rows } = await pool.query(
      `SELECT * FROM traffic_rules WHERE pub_id = $1 ORDER BY id DESC`,
      [pub_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /api/distribution/rules:", err);
    res.status(500).json({ error: "Failed to load rules" });
  }
});

/* ------------------------------------------------------------
   GET: Remaining % (used weight by tracking link)
------------------------------------------------------------ */
router.get("/rules/remaining", async (req, res) => {
  try {
    let { pub_id, tracking_link_id } = req.query;
    pub_id = normalizePub(pub_id);

    let query = `SELECT COALESCE(SUM(weight), 0) AS used FROM traffic_rules WHERE pub_id = $1`;
    const params = [pub_id];

    if (tracking_link_id) {
      query += ` AND tracking_link_id = $2`;
      params.push(tracking_link_id);
    }

    const { rows } = await pool.query(query, params);

    const remaining = 100 - Number(rows[0].used || 0);

    res.json({ remaining });
  } catch (err) {
    console.error("GET /api/distribution/rules/remaining:", err);
    res.status(500).json({ error: "Failed to load remaining percentage" });
  }
});

/* ------------------------------------------------------------
   GET: OFFERS (filter by geo/carrier/exclude)
------------------------------------------------------------ */
router.get("/offers", async (req, res) => {
  try {
    const { geo, carrier, exclude } = req.query;

    const excludeList = exclude
      ? exclude.split(",").map((x) => Number(x))
      : [];

    let query = `
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

    if (geo) {
      query += ` AND (geo = $${params.length + 1} OR geo IS NULL OR geo = '')`;
      params.push(geo);
    }

    if (carrier) {
      query += ` AND (carrier = $${params.length + 1} OR carrier IS NULL OR carrier = '')`;
      params.push(carrier);
    }

    if (excludeList.length) {
      query += ` AND id NOT IN (${excludeList.map((_, i) => `$${params.length + i + 1}`).join(",")})`;
      params.push(...excludeList);
    }

    const { rows } = await pool.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error("GET /api/distribution/offers:", err);
    res.status(500).json({ error: "Failed to load offers" });
  }
});

/* ------------------------------------------------------------
   POST: CREATE RULE
------------------------------------------------------------ */
router.post("/rules", async (req, res) => {
  try {
    const data = req.body;

    if (!data.pub_id || !data.tracking_link_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // prevent duplicates
    const dup = await pool.query(
      `SELECT id FROM traffic_rules WHERE pub_id=$1 AND tracking_link_id=$2 AND offer_id=$3`,
      [data.pub_id, data.tracking_link_id, data.offer_id]
    );

    if (dup.rows.length) {
      return res.status(409).json({ error: "Offer already assigned" });
    }

    await pool.query(
      `
      INSERT INTO traffic_rules
      (pub_id, publisher_id, publisher_name, tracking_link_id, geo, carrier,
       offer_id, offer_code, offer_name, advertiser_name, redirect_url, type, weight, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `,
      [
        data.pub_id,
        data.publisher_id,
        data.publisher_name,
        data.tracking_link_id,
        data.geo,
        data.carrier,
        data.offer_id,
        data.offer_code,
        data.offer_name,
        data.advertiser_name,
        data.redirect_url,
        data.type,
        data.weight,
        data.created_by,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/distribution/rules:", err);
    res.status(500).json({ error: "Failed to create rule" });
  }
});

/* ------------------------------------------------------------
   PUT: UPDATE RULE
------------------------------------------------------------ */
router.put("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    await pool.query(
      `
      UPDATE traffic_rules SET
        tracking_link_id=$1, geo=$2, carrier=$3,
        offer_id=$4, offer_code=$5, offer_name=$6,
        advertiser_name=$7, redirect_url=$8, type=$9,
        weight=$10
      WHERE id=$11
      `,
      [
        data.tracking_link_id,
        data.geo,
        data.carrier,
        data.offer_id,
        data.offer_code,
        data.offer_name,
        data.advertiser_name,
        data.redirect_url,
        data.type,
        data.weight,
        id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/distribution/rules:", err);
    res.status(500).json({ error: "Failed to update rule" });
  }
});

/* ------------------------------------------------------------
   DELETE: DELETE RULE
------------------------------------------------------------ */
router.delete("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;

    await pool.query(`DELETE FROM traffic_rules WHERE id=$1`, [id]);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/distribution/rules:", err);
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

/* ------------------------------------------------------------
   REDIRECT ENGINE (publisher_distributions)
------------------------------------------------------------ */
const weightedPick = (rows) => {
  let arr = [];
  rows.forEach((r) => {
    for (let i = 0; i < r.percentage; i++) arr.push(r.offer_id);
  });
  return arr[Math.floor(Math.random() * arr.length)];
};

router.get("/click", async (req, res) => {
  try {
    const { pub_id, geo, carrier } = req.query;
    const cleanPub = normalizePub(pub_id);

    const rules = await pool.query(
      `
      SELECT offer_id, percentage
      FROM publisher_distributions
      WHERE pub_id=$1
      AND (geo=$2 OR geo IS NULL OR geo='')
      AND (carrier=$3 OR carrier IS NULL OR carrier='')
      ORDER BY sequence_order ASC
      `,
      [cleanPub, geo, carrier]
    );

    if (!rules.rows.length) return res.redirect("https://google.com");

    const picked = weightedPick(rules.rows);

    const offer = await pool.query(`SELECT tracking_url FROM offers WHERE id=$1`, [
      picked,
    ]);

    const url = offer.rows[0]?.tracking_url || "https://google.com";

    await pool.query(
      `INSERT INTO analytics_clicks (partner_id, ip, user_agent, redirect_url)
       VALUES ($1,$2,$3,$4)`,
      [picked, req.ip, req.headers["user-agent"], url]
    );

    res.redirect(url);
  } catch (err) {
    console.error("GET /api/distribution/click:", err);
    res.redirect("https://google.com");
  }
});

export default router;
