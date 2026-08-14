import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

/* ── GET ALL GROUPS ─────────────────────────────── */
router.get("/offer-groups", orgAuth, async (req, res) => {
  try {
    const groups = await pool.query(`
      SELECT og.*,
        COUNT(ogi.id) FILTER (WHERE ogi.status='active') AS offer_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ogi.id,
              'offer_id', ogi.offer_id,
              'offer_name', o.service_name,
              'geo', o.geo,
              'carrier', o.carrier,
              'weight', ogi.weight,
              'status', ogi.status
            ) ORDER BY ogi.weight DESC
          ) FILTER (WHERE ogi.id IS NOT NULL), '[]'
        ) AS items,
        COALESCE(
          json_agg(DISTINCT
            json_build_object('id', p.id, 'name', p.name)
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS publishers
      FROM offer_groups og
      LEFT JOIN offer_group_items ogi ON ogi.group_id = og.id
      LEFT JOIN offers o ON o.id = ogi.offer_id
      LEFT JOIN offer_group_publisher ogp ON ogp.group_id = og.id
      LEFT JOIN publishers p ON p.id = ogp.publisher_id
      WHERE og.org_id = $1
      GROUP BY og.id
      ORDER BY og.created_at DESC
    `, [req.orgId]);

    res.json({ status: "SUCCESS", data: groups.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ── CREATE GROUP ───────────────────────────────── */
router.post("/offer-groups", orgAuth, async (req, res) => {
  try {
    const { name, geo, carrier, description, items = [], publisher_ids = [] } = req.body;
    if (!name) return res.status(400).json({ status: "FAILED", error: "name required" });

    // Validate weights sum
    const totalWeight = items.reduce((s, i) => s + Number(i.weight), 0);
    if (items.length > 0 && totalWeight !== 100) {
      return res.status(400).json({ status: "FAILED", error: `Weights must sum to 100 (currently ${totalWeight})` });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const groupRes = await client.query(`
        INSERT INTO offer_groups (org_id, name, geo, carrier, description)
        VALUES ($1,$2,$3,$4,$5) RETURNING *
      `, [req.orgId, name, geo || null, carrier || null, description || null]);

      const group = groupRes.rows[0];

      // Add items
      for (const item of items) {
        await client.query(`
          INSERT INTO offer_group_items (group_id, offer_id, weight)
          VALUES ($1,$2,$3)
        `, [group.id, item.offer_id, item.weight]);
      }

      // Assign publishers
      for (const pub_id of publisher_ids) {
        await client.query(`
          INSERT INTO offer_group_publisher (group_id, publisher_id, org_id)
          VALUES ($1,$2,$3) ON CONFLICT DO NOTHING
        `, [group.id, pub_id, req.orgId]);
      }

      await client.query("COMMIT");
      res.json({ status: "SUCCESS", data: group });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ── UPDATE GROUP ───────────────────────────────── */
router.put("/offer-groups/:id", orgAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, geo, carrier, description, status, items, publisher_ids } = req.body;

    if (items) {
      const totalWeight = items.reduce((s, i) => s + Number(i.weight), 0);
      if (items.length > 0 && totalWeight !== 100) {
        return res.status(400).json({ status: "FAILED", error: `Weights must sum to 100 (currently ${totalWeight})` });
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(`
        UPDATE offer_groups SET
          name = COALESCE($1, name),
          geo = COALESCE($2, geo),
          carrier = COALESCE($3, carrier),
          description = COALESCE($4, description),
          status = COALESCE($5, status)
        WHERE id = $6 AND org_id = $7
      `, [name, geo, carrier, description, status, id, req.orgId]);

      if (items) {
        await client.query(`DELETE FROM offer_group_items WHERE group_id = $1`, [id]);
        for (const item of items) {
          await client.query(`
            INSERT INTO offer_group_items (group_id, offer_id, weight)
            VALUES ($1,$2,$3)
          `, [id, item.offer_id, item.weight]);
        }
      }

      if (publisher_ids) {
        await client.query(`DELETE FROM offer_group_publisher WHERE group_id = $1`, [id]);
        for (const pub_id of publisher_ids) {
          await client.query(`
            INSERT INTO offer_group_publisher (group_id, publisher_id, org_id)
            VALUES ($1,$2,$3) ON CONFLICT DO NOTHING
          `, [id, pub_id, req.orgId]);
        }
      }

      await client.query("COMMIT");
      res.json({ status: "SUCCESS" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ── DELETE GROUP ───────────────────────────────── */
router.delete("/offer-groups/:id", orgAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM offer_groups WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId]);
    res.json({ status: "SUCCESS" });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ── WEIGHTED RANDOM ROUTER ─────────────────────── */
// This is used by pin.routes.js internally
export async function resolveGroupOffer(group_id, orgId) {
  const items = await pool.query(`
    SELECT ogi.offer_id, ogi.weight
    FROM offer_group_items ogi
    JOIN offer_groups og ON og.id = ogi.group_id
    WHERE ogi.group_id = $1 AND og.org_id = $2
    AND ogi.status = 'active' AND og.status = 'active'
    ORDER BY ogi.weight DESC
  `, [group_id, orgId]);

  if (!items.rows.length) return null;

  // Weighted random selection
  const total = items.rows.reduce((s, r) => s + Number(r.weight), 0);
  let rand = Math.random() * total;

  for (const row of items.rows) {
    rand -= Number(row.weight);
    if (rand <= 0) return row.offer_id;
  }

  return items.rows[0].offer_id;
}

/* ── GROUP PIN SEND — Publisher hits this ─────── */
router.get("/publisher/group/:group_id/pin/send", async (req, res) => {
  try {
    const { group_id } = req.params;
    const apiKey = req.headers["x-api-key"] || req.query["x-api-key"];

    if (!apiKey) return res.status(401).json({ status: "UNAUTHORIZED", message: "API key required" });

    // Verify publisher
    const pubRes = await pool.query(
      `SELECT p.*, p.org_id FROM publishers p WHERE p.api_key = $1 AND p.status = 'active'`,
      [apiKey]
    );
    if (!pubRes.rows.length) return res.status(401).json({ status: "UNAUTHORIZED", message: "Invalid API key" });

    const publisher = pubRes.rows[0];

    // Verify publisher is assigned to this group
    const assignRes = await pool.query(
      `SELECT id FROM offer_group_publisher WHERE group_id=$1 AND publisher_id=$2`,
      [group_id, publisher.id]
    );
    if (!assignRes.rows.length) {
      return res.status(403).json({ status: "FAILED", message: "Publisher not assigned to this group" });
    }

    // Get weighted random offer
    const offer_id = await resolveGroupOffer(group_id, publisher.org_id);
    if (!offer_id) return res.status(404).json({ status: "FAILED", message: "No active offers in group" });

    // Redirect to normal pin send with resolved offer_id
    const params = new URLSearchParams(req.query);
    params.set("offer_id", offer_id);
    params.delete("group_id");

    // Forward to pin send internally
    res.redirect(307, `/api/publisher/pin/send?${params.toString()}`);

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

export default router;
