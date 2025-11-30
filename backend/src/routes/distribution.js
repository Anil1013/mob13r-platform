// src/routes/distribution.js
import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/**
 * ============================
 *  ADMIN API (JWT PROTECTED)
 * ============================
 */

/**
 * GET /api/distribution/meta?pub_id=PUB01
 * - Returns all distribution_meta rows for a publisher
 */
router.get("/meta", authenticateJWT, async (req, res) => {
  const { pub_id } = req.query;

  if (!pub_id) {
    return res.status(400).json({ message: "pub_id is required" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        dm.id,
        dm.pub_id,
        dm.tracking_link_id,
        dm.total_hit,
        dm.remaining_hit,
        dm.is_active,
        dm.created_at,
        dm.updated_at,
        tl.geo,
        tl.carrier,
        tl.id AS tracking_id,
        tl.name AS tracking_name
      FROM distribution_meta dm
      LEFT JOIN tracking_links tl
        ON tl.id = dm.tracking_link_id
      WHERE dm.pub_id = $1
      ORDER BY dm.id ASC
      `,
      [pub_id]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /distribution/meta error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/distribution/meta
 * Body: { pub_id, tracking_link_id, total_hit, remaining_hit, is_active }
 * - Upsert single meta row for a publisher + tracking_link
 */
router.post("/meta", authenticateJWT, async (req, res) => {
  const {
    pub_id,
    tracking_link_id,
    total_hit = 0,
    remaining_hit = 0,
    is_active = true,
  } = req.body || {};

  if (!pub_id || !tracking_link_id) {
    return res
      .status(400)
      .json({ message: "pub_id and tracking_link_id are required" });
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO distribution_meta (
        pub_id,
        tracking_link_id,
        total_hit,
        remaining_hit,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (pub_id, tracking_link_id)
      DO UPDATE SET
        total_hit = EXCLUDED.total_hit,
        remaining_hit = EXCLUDED.remaining_hit,
        is_active = EXCLUDED.is_active,
        updated_at = now()
      RETURNING *
      `,
      [pub_id, tracking_link_id, total_hit, remaining_hit, is_active]
    );

    return res.json(rows[0]);
  } catch (err) {
    console.error("POST /distribution/meta error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /api/distribution/rules?pub_id=PUB01&tracking_link_id=3
 * - Returns rules with joined info for UI
 */
router.get("/rules", authenticateJWT, async (req, res) => {
  const { pub_id, tracking_link_id } = req.query;

  if (!pub_id || !tracking_link_id) {
    return res
      .status(400)
      .json({ message: "pub_id and tracking_link_id are required" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        dr.id,
        dr.pub_id,
        dr.tracking_link_id,
        dr.offer_id,
        dr.weight,
        dr.created_at,
        dr.updated_at,
        tl.geo,
        tl.carrier,
        p.name  AS publisher_name,
        o.name  AS offer_name,
        a.name  AS advertiser_name
      FROM distribution_rules dr
      LEFT JOIN tracking_links tl
        ON tl.id = dr.tracking_link_id
      LEFT JOIN publishers p
        ON p.pub_id = dr.pub_id
      LEFT JOIN offers o
        ON o.offer_id = dr.offer_id
      LEFT JOIN advertisers a
        ON a.id = o.advertiser_id
      WHERE dr.pub_id = $1
        AND dr.tracking_link_id = $2
      ORDER BY dr.id ASC
      `,
      [pub_id, tracking_link_id]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /distribution/rules error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/distribution/rules/bulk
 * Body: {
 *   pub_id,
 *   tracking_link_id,
 *   rules: [{ offer_id, weight }]
 * }
 * - Replace existing rules for (pub_id, tracking_link_id) with new set
 */
router.post("/rules/bulk", authenticateJWT, async (req, res) => {
  const { pub_id, tracking_link_id, rules } = req.body || {};

  if (!pub_id || !tracking_link_id || !Array.isArray(rules)) {
    return res.status(400).json({
      message: "pub_id, tracking_link_id and rules[] are required",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Delete old rules
    await client.query(
      "DELETE FROM distribution_rules WHERE pub_id = $1 AND tracking_link_id = $2",
      [pub_id, tracking_link_id]
    );

    // Insert new rules
    for (const rule of rules) {
      if (!rule.offer_id || typeof rule.weight !== "number") continue;

      await client.query(
        `
        INSERT INTO distribution_rules (
          pub_id,
          tracking_link_id,
          offer_id,
          weight
        )
        VALUES ($1, $2, $3, $4)
        `,
        [pub_id, tracking_link_id, rule.offer_id, rule.weight]
      );
    }

    await client.query("COMMIT");

    return res.json({ message: "Rules updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /distribution/rules/bulk error:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/distribution/rules/:id
 * - Delete a single rule row
 */
router.delete("/rules/:id", authenticateJWT, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM distribution_rules WHERE id = $1", [id]);
    return res.json({ message: "Rule deleted" });
  } catch (err) {
    console.error("DELETE /distribution/rules/:id error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ==============================================
 *  HELPER: PICK OFFER FOR CLICK DISTRIBUTION
 * ==============================================
 *
 * Yeh function click route se call karoge.
 *
 * Usage (example in your /click handler):
 *
 *   import { pickOfferForDistribution } from "./routes/distribution.js";
 *
 *   const choice = await pickOfferForDistribution({ pubId, geo, carrier });
 *   if (choice) {
 *      // distribution ke hisaab se offer choose ho gaya
 *      const { offerId, trackingLinkId, isFromDistribution } = choice;
 *      // yahan se redirect logic / tracking logic chalao
 *   } else {
 *      // KOI DISTRIBUTION MATCH NAHI → tumhara
 *      // existing fallback logic run hoga (offer table / traffic_rules ke hisaab se)
 *   }
 */

export async function pickOfferForDistribution({
  pubId,
  geo,
  carrier,
  client = null,
}) {
  if (!pubId || !geo || !carrier) {
    return null;
  }

  const db = client || pool;
  let localClient = null;

  try {
    // if no external transaction client provided, create one
    if (!client) {
      localClient = await db.connect();
    }

    const c = localClient || client;

    // 1) Find tracking_link_id with active meta + remaining_hit > 0
    const metaResult = await c.query(
      `
      SELECT
        dm.id,
        dm.tracking_link_id,
        dm.remaining_hit,
        dm.total_hit
      FROM distribution_meta dm
      JOIN tracking_links tl
        ON tl.id = dm.tracking_link_id
      WHERE dm.pub_id = $1
        AND dm.is_active = true
        AND dm.remaining_hit > 0
        AND tl.geo = $2
        AND tl.carrier = $3
      ORDER BY dm.id ASC
      LIMIT 1
      `,
      [pubId, geo, carrier]
    );

    if (metaResult.rows.length === 0) {
      // No active distribution meta → let caller use normal fallback
      return null;
    }

    const metaRow = metaResult.rows[0];
    const trackingLinkId = metaRow.tracking_link_id;

    // 2) Get rules for this pub_id + tracking_link_id
    const rulesResult = await c.query(
      `
      SELECT offer_id, weight
      FROM distribution_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
      `,
      [pubId, trackingLinkId]
    );

    const rules = rulesResult.rows || [];
    if (!rules.length) {
      // No rules configured → use normal fallback
      return null;
    }

    // 3) Weighted random selection
    const totalWeight = rules.reduce(
      (sum, r) => sum + (Number(r.weight) || 0),
      0
    );

    if (totalWeight <= 0) {
      // Invalid weights → fallback
      return null;
    }

    const rnd = Math.random() * totalWeight;
    let cumulative = 0;
    let selectedOfferId = null;

    for (const r of rules) {
      const w = Number(r.weight) || 0;
      cumulative += w;
      if (rnd <= cumulative) {
        selectedOfferId = r.offer_id;
        break;
      }
    }

    if (!selectedOfferId) {
      // safety fallback
      selectedOfferId = rules[rules.length - 1].offer_id;
    }

    // 4) Update meta hits: total_hit++, remaining_hit--
    await c.query(
      `
      UPDATE distribution_meta
      SET
        total_hit = total_hit + 1,
        remaining_hit = GREATEST(remaining_hit - 1, 0),
        updated_at = now()
      WHERE pub_id = $1
        AND tracking_link_id = $2
      `,
      [pubId, trackingLinkId]
    );

    return {
      offerId: selectedOfferId,
      trackingLinkId,
      isFromDistribution: true,
    };
  } catch (err) {
    console.error("pickOfferForDistribution error:", err);
    return null; // Any error → let normal fallback handle
  } finally {
    if (localClient) {
      localClient.release();
    }
  }
}

export default router;
