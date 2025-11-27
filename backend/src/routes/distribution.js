import express from "express";
import pool from "../db.js";

const router = express.Router();

/* ===================================================================
   UTILS
=================================================================== */

// PUB03 → 3
const normalizePub = (pub) => {
  if (!pub) return null;
  return pub.toString().replace(/\D+/g, "");
};

/* ===================================================================
    1) OVERVIEW  (for bottom global table)
=================================================================== */

router.get("/overview", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.id,
        r.pub_id,
        r.tracking_link_id,
        r.geo,
        r.carrier,
        r.weight,
        r.offer_id,
        r.offer_code,
        r.offer_name,
        r.advertiser_name,
        r.publisher_name
      FROM traffic_rules r
      ORDER BY r.pub_id ASC, r.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("overview error:", err);
    res.status(500).json({ error: "overview failed" });
  }
});

/* ===================================================================
    2) META (publisher tracking links)
=================================================================== */

router.get("/meta", async (req, res) => {
  try {
    let { pub_id } = req.query;
    pub_id = normalizePub(pub_id);

    const [rows] = await pool.query(
      `
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
      WHERE p.pub_code = ?
      ORDER BY tl.id ASC
      `,
      [`PUB${pub_id}`]
    );

    res.json(rows);
  } catch (err) {
    console.error("meta error:", err);
    res.status(500).json({ error: "meta failed" });
  }
});

/* ===================================================================
    3) RULE LIST (traffic_rules)
=================================================================== */

router.get("/rules", async (req, res) => {
  try {
    let { pub_id } = req.query;
    pub_id = normalizePub(pub_id);

    const [rows] = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = ?
      ORDER BY id DESC
      `,
      [pub_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("rules error:", err);
    res.status(500).json({ error: "rules failed" });
  }
});

/* ===================================================================
    4) REMAINING PERCENTAGE (per tracking link)
=================================================================== */

router.get("/rules/remaining", async (req, res) => {
  try {
    let { pub_id, tracking_link_id } = req.query;
    pub_id = normalizePub(pub_id);

    let query = `SELECT COALESCE(SUM(weight), 0) AS used FROM traffic_rules WHERE pub_id = ?`;
    let params = [pub_id];

    if (tracking_link_id) {
      query += ` AND tracking_link_id = ?`;
      params.push(tracking_link_id);
    }

    const [[row]] = await pool.query(query, params);

    const remaining = 100 - Number(row.used);

    res.json({ remaining });
  } catch (err) {
    console.error("remaining error:", err);
    res.status(500).json({ error: "remaining failed" });
  }
});

/* ===================================================================
    5) OFFERS LIST
=================================================================== */

router.get("/offers", async (req, res) => {
  try {
    const { geo, carrier, exclude } = req.query;

    const excludeList = exclude
      ? exclude.split(",").map((id) => Number(id))
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
      query += ` AND (geo = ? OR geo IS NULL OR geo = '')`;
      params.push(geo);
    }

    if (carrier) {
      query += ` AND (carrier = ? OR carrier IS NULL OR carrier = '')`;
      params.push(carrier);
    }

    if (excludeList.length) {
      query += ` AND id NOT IN (${excludeList.map(() => "?").join(",")})`;
      params.push(...excludeList);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("offers error:", err);
    res.status(500).json({ error: "offers failed" });
  }
});

/* ===================================================================
    6) CREATE RULE
=================================================================== */

router.post("/rules", async (req, res) => {
  try {
    const data = req.body;

    if (!data.pub_id || !data.tracking_link_id) {
      return res.status(400).json({ error: "Missing pub_id or tracking_link_id" });
    }

    // Check duplicate
    const [[dup]] = await pool.query(
      `
      SELECT id FROM traffic_rules
      WHERE pub_id = ? AND tracking_link_id = ? AND offer_id = ?
      `,
      [data.pub_id, data.tracking_link_id, data.offer_id]
    );

    if (dup) {
      return res.status(409).json({ error: "Duplicate rule" });
    }

    await pool.query(
      `
      INSERT INTO traffic_rules
      (pub_id, publisher_id, publisher_name, tracking_link_id,
       geo, carrier, offer_id, offer_code, offer_name,
       advertiser_name, redirect_url, type, weight, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    console.error("create rule error:", err);
    res.status(500).json({ error: "create failed" });
  }
});

/* ===================================================================
    7) UPDATE RULE
=================================================================== */

router.put("/rules/:id", async (req, res) => {
  try {
    const id = req.params.id;
