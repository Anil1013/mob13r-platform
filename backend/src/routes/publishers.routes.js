import express from "express";
import crypto from "crypto";
import pool from "../db.js";
import authMiddleware from "../middleware/auth.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

function generatePublisherKey() {
  return "pub_" + crypto.randomBytes(16).toString("hex");
}

router.get("/", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, api_key, status, created_at FROM publishers WHERE org_id = $1 ORDER BY id DESC`,
      [req.orgId]
    );
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET PUBLISHERS ERROR:", err);
    res.status(500).json({ status: "FAILED", message: "Failed to load publishers" });
  }
});

router.post("/", orgAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ status: "FAILED", message: "Publisher name required" });

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM publishers WHERE org_id = $1`,
      [req.orgId]
    );
    if (countRes.rows[0].count >= req.org.max_publishers) {
      return res.status(403).json({
        status: "LIMIT_REACHED",
        message: `Publisher limit reached (${req.org.max_publishers}). Upgrade your plan to add more.`
      });
    }

    const apiKey = generatePublisherKey();
    const result = await pool.query(
      `INSERT INTO publishers (name, api_key, status, org_id) VALUES ($1, $2, 'active', $3) RETURNING *`,
      [name, apiKey, req.orgId]
    );
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("ADD PUBLISHER ERROR:", err);
    res.status(500).json({ status: "FAILED", message: "Failed to create publisher" });
  }
});

router.patch("/:id/status", orgAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "paused"].includes(status)) return res.status(400).json({ status: "FAILED", message: "Invalid status" });
    await pool.query(
      `UPDATE publishers SET status = $1 WHERE id = $2 AND org_id = $3`,
      [status, id, req.orgId]
    );
    res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("UPDATE PUBLISHER STATUS ERROR:", err);
    res.status(500).json({ status: "FAILED", message: "Failed to update publisher status" });
  }
});

router.get("/offers/all", orgAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.id, po.publisher_id, p.name AS publisher_name, po.offer_id,
              o.service_name AS name, o.geo, o.carrier, po.publisher_cpa,
              po.daily_cap, po.pass_percent, po.weight, po.status
       FROM publisher_offers po
       JOIN publishers p ON p.id = po.publisher_id
       JOIN offers o ON o.id = po.offer_id
       WHERE p.org_id = $1
       ORDER BY p.name, po.id DESC`,
      [req.orgId]
    );
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET ALL ASSIGNED OFFERS ERROR:", err);
    res.status(500).json({ status: "FAILED", message: "Failed to load assigned offers" });
  }
});

router.get("/:publisherId/offers", orgAuth, async (req, res) => {
  try {
    const { publisherId } = req.params;
    const result = await pool.query(
      `SELECT po.id, po.publisher_id, po.offer_id, o.service_name AS name,
              o.geo, o.carrier, po.publisher_cpa, po.daily_cap, po.pass_percent, po.weight, po.status
       FROM publisher_offers po
       JOIN offers o ON o.id = po.offer_id
       JOIN publishers p ON p.id = po.publisher_id
       WHERE po.publisher_id = $1 AND p.org_id = $2
       ORDER BY po.id DESC`,
      [publisherId, req.orgId]
    );
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    console.error("GET ASSIGNED OFFERS ERROR:", err);
    res.status(500).json({ status: "FAILED", message: "Failed to load assigned offers" });
  }
});

router.post("/:publisherId/offers", orgAuth, async (req, res) => {
  try {
    const { publisherId } = req.params;
    const { offer_id, publisher_cpa, daily_cap = 0, pass_percent = 100, weight = 100 } = req.body;
    if (!offer_id || publisher_cpa === undefined) return res.status(400).json({ status: "FAILED", message: "offer_id and publisher_cpa required" });
    const exists = await pool.query(
      `SELECT id FROM publisher_offers WHERE publisher_id = $1 AND offer_id = $2`,
      [publisherId, offer_id]
    );
    if (exists.rows.length) return res.status(400).json({ status: "FAILED", message: "Offer already assigned" });
    const insert = await pool.query(
      `INSERT INTO publisher_offers (publisher_id, offer_id, publisher_cpa, daily_cap, pass_percent, weight, status, org_id)
       VALUES ($1,$2,$3,$4,$5,$6,'active',$7) RETURNING *`,
      [publisherId, offer_id, publisher_cpa, daily_cap, pass_percent, weight, req.orgId]
    );
    res.json({ status: "SUCCESS", data: insert.rows[0] });
  } catch (err) {
    console.error("ASSIGN OFFER ERROR:", err);
    res.status(500).json({ status: "FAILED", message: "Offer assignment failed" });
  }
});

router.patch("/:publisherId/offers/:id", orgAuth, async (req, res) => {
  try {
    const { publisherId, id } = req.params;
    const { status, publisher_cpa, daily_cap, pass_percent, weight } = req.body;
    await pool.query(
      `UPDATE publisher_offers SET
        status = COALESCE($1, status),
        publisher_cpa = COALESCE($2, publisher_cpa),
        daily_cap = COALESCE($3, daily_cap),
        pass_percent = COALESCE($4, pass_percent),
        weight = COALESCE($5, weight)
       WHERE id = $6 AND publisher_id = $7`,
      [status, publisher_cpa, daily_cap, pass_percent, weight, id, publisherId]
    );
    res.json({ status: "SUCCESS" });
  } catch (err) {
    console.error("UPDATE ASSIGNED OFFER ERROR:", err);
    res.status(500).json({ status: "FAILED", message: "Failed to update assigned offer" });
  }
});

export default router;
