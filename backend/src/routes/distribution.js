// src/routes/distribution.js
import { Router } from "express";
import pool from "../db.js";

const router = Router();

/**
 * GET /api/distribution/meta?pub_id=PUB03
 * - publisher info
 * - tracking links for this publisher (from `tracking` table)
 */
router.get("/meta", async (req, res) => {
  const { pub_id } = req.query;

  if (!pub_id) {
    return res.status(400).json({ error: "pub_id is required" });
  }

  try {
    // 1) Publisher info
    const publisherResult = await pool.query(
      `
      SELECT *
      FROM publishers
      WHERE pub_id = $1
      `,
      [pub_id]
    );

    // 2) Tracking links for this publisher
    const trackingResult = await pool.query(
      `
      SELECT
        id,             -- this is the tracking_link_id
        pub_id,
        publisher_id,
        publisher_name,
        name,
        geo,
        carrier,
        type,
        payout,
        cap_daily,
        cap_total,
        hold_percent,
        landing_page_url,
        tracking_url,
        pin_send_url,
        pin_verify_url,
        check_status_url,
        portal_url,
        created_at
      FROM tracking
      WHERE pub_id = $1
      ORDER BY id ASC
      `,
      [pub_id]
    );

    return res.json({
      publisher: publisherResult.rows[0] || null,
      tracking_links: trackingResult.rows, // frontend: tracking_links[i].id is tracking_link_id
    });
  } catch (err) {
    console.error("META ERROR:", err);
    return res.status(500).json({ error: "Failed to load distribution meta" });
  }
});

/**
 * GET /api/distribution/rules?pub_id=PUB03
 * All traffic rules for the publisher
 */
router.get("/rules", async (req, res) => {
  const { pub_id } = req.query;

  if (!pub_id) {
    return res.status(400).json({ error: "pub_id is required" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        pub_id,
        publisher_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status,
        created_by,
        created_at,
        updated_at
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY tracking_link_id, id
      `,
      [pub_id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("RULES ERROR:", err);
    return res.status(500).json({ error: "Failed to load rules" });
  }
});

/**
 * GET /api/distribution/rules/remaining?pub_id=PUB03
 * Tracking links that don't have any traffic_rules yet
 */
router.get("/rules/remaining", async (req, res) => {
  const { pub_id } = req.query;

  if (!pub_id) {
    return res.status(400).json({ error: "pub_id is required" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        t.id,           -- tracking_link_id
        t.pub_id,
        t.publisher_id,
        t.publisher_name,
        t.name,
        t.geo,
        t.carrier,
        t.type,
        t.payout,
        t.cap_daily,
        t.cap_total,
        t.hold_percent,
        t.landing_page_url,
        t.tracking_url,
        t.pin_send_url,
        t.pin_verify_url,
        t.check_status_url,
        t.portal_url,
        t.created_at
      FROM tracking t
      WHERE t.pub_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM traffic_rules r
          WHERE r.pub_id = t.pub_id
            AND r.tracking_link_id = t.id
        )
      ORDER BY t.id ASC
      `,
      [pub_id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("REMAINING RULES ERROR:", err);
    return res.status(500).json({ error: "Failed to load remaining tracking links" });
  }
});

/**
 * PUT /api/distribution/rules/:id
 * Update a single rule
 */
router.put("/rules/:id", async (req, res) => {
  const { id } = req.params;
  const {
    pub_id,
    publisher_id,
    publisher_name,
    tracking_link_id,
    geo,
    carrier,
    offer_id,
    offer_name,
    advertiser_name,
    redirect_url,
    type,
    weight,
    status,
    created_by,
  } = req.body;

  try {
    const result = await pool.query(
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
        offer_name = $8,
        advertiser_name = $9,
        redirect_url = $10,
        type = $11,
        weight = $12,
        status = $13,
        created_by = $14,
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
      `,
      [
        pub_id,
        publisher_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status,
        created_by,
        id,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    return res.status(500).json({ error: "Failed to update rule" });
  }
});

/**
 * POST /api/distribution/rules
 * Create new rule
 */
router.post("/rules", async (req, res) => {
  const {
    pub_id,
    publisher_id,
    publisher_name,
    tracking_link_id,
    geo,
    carrier,
    offer_id,
    offer_name,
    advertiser_name,
    redirect_url,
    type,
    weight,
    status,
    created_by,
  } = req.body;

  try {
    const result = await pool.query(
      `
      INSERT INTO traffic_rules (
        pub_id,
        publisher_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
      `,
      [
        pub_id,
        publisher_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id,
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status,
        created_by,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE RULE ERROR:", err);
    return res.status(500).json({ error: "Failed to create rule" });
  }
});

export default router;
