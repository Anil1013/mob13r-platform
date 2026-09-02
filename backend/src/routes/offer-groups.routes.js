import express from "express";
import pool from "../db.js";
import orgAuth from "../middleware/orgAuth.js";

const router = express.Router();

/* ── GET ALL GROUPS ─────────────────────────────── */
router.get("/offer-groups", orgAuth, async (req, res) => {
  try {
    const groups = await pool.query(`
      SELECT og.*, pub.name AS publisher_name,
        COUNT(ogi.id) FILTER (WHERE ogi.status='active') AS offer_count,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ogi.id,
              'offer_id', ogi.offer_id,
              'offer_name', o.service_name,
              'geo', o.geo,
              'carrier', o.carrier,
              'weight', ogi.weight,
              'status', ogi.status
            ) ORDER BY ogi.weight DESC
          ) FILTER (WHERE ogi.id IS NOT NULL), '[]'
        ) AS items
      FROM offer_groups og
      LEFT JOIN publishers pub ON pub.id = og.publisher_id
      LEFT JOIN offer_group_items ogi ON ogi.group_id = og.id
      LEFT JOIN offers o ON o.id = ogi.offer_id
      WHERE og.org_id = $1
      GROUP BY og.id, pub.name
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
    const { name, geo, carrier, description, items = [], publisher_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ status: "FAILED", error: "name required" });

    // Validate weights sum
    const totalWeight = items.reduce((s, i) => s + Number(i.weight), 0);
    if (items.length > 0 && totalWeight !== 100) {
      return res.status(400).json({ status: "FAILED", error: `Weights must sum to 100 (currently ${totalWeight})` });
    }

    let publisherId = null;
    if (publisher_id) {
      const pubCheck = await pool.query(`SELECT id FROM publishers WHERE id = $1 AND org_id = $2`, [publisher_id, req.orgId]);
      if (!pubCheck.rows.length) return res.status(400).json({ status: "FAILED", error: "Publisher not found" });
      publisherId = publisher_id;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const groupRes = await client.query(`
        INSERT INTO offer_groups (org_id, name, geo, carrier, description, publisher_id, status)
        VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING *
      `, [req.orgId, name.trim(), (geo || "").trim() || null, (carrier || "").trim() || null, description || null, publisherId]);

      const group = groupRes.rows[0];

      for (const item of items) {
        await client.query(`
          INSERT INTO offer_group_items (group_id, offer_id, weight)
          VALUES ($1,$2,$3)
        `, [group.id, item.offer_id, item.weight]);
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
    if (err.code === "23505" && err.constraint === "idx_offer_groups_unique_active_publisher_scoped") {
      return res.status(400).json({ status: "FAILED", error: "This publisher already has an active offer group for this Geo/Carrier — pause or edit the existing one instead of creating a second one." });
    }
    if (err.code === "23505" && err.constraint === "idx_offer_groups_unique_active_generic") {
      return res.status(400).json({ status: "FAILED", error: "An active generic (no specific publisher) offer group already exists for this Geo/Carrier — pause or edit the existing one instead of creating a second one." });
    }
    console.error(err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ── FULL EDIT — name, geo, carrier, offers, and which publisher (if
   any) it's scoped to ───────────────────────────── */
router.put("/offer-groups/:id", orgAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, geo, carrier, description, status, items, publisher_id } = req.body;

    if (items) {
      const totalWeight = items.reduce((s, i) => s + Number(i.weight), 0);
      if (items.length > 0 && totalWeight !== 100) {
        return res.status(400).json({ status: "FAILED", error: `Weights must sum to 100 (currently ${totalWeight})` });
      }
    }

    let publisherId;
    if (publisher_id !== undefined) {
      if (publisher_id === null || publisher_id === "") {
        publisherId = null;
      } else {
        const pubCheck = await pool.query(`SELECT id FROM publishers WHERE id = $1 AND org_id = $2`, [publisher_id, req.orgId]);
        if (!pubCheck.rows.length) return res.status(400).json({ status: "FAILED", error: "Publisher not found" });
        publisherId = publisher_id;
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
          status = COALESCE($5, status),
          publisher_id = CASE WHEN $8::boolean THEN $9 ELSE publisher_id END
        WHERE id = $6 AND org_id = $7
      `, [name, geo, carrier, description, status, id, req.orgId, publisher_id !== undefined, publisherId ?? null]);

      if (items) {
        await client.query(`DELETE FROM offer_group_items WHERE group_id = $1`, [id]);
        for (const item of items) {
          await client.query(`
            INSERT INTO offer_group_items (group_id, offer_id, weight)
            VALUES ($1,$2,$3)
          `, [id, item.offer_id, item.weight]);
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
    if (err.code === "23505" && err.constraint === "idx_offer_groups_unique_active_publisher_scoped") {
      return res.status(400).json({ status: "FAILED", error: "This publisher already has another active offer group for that Geo/Carrier." });
    }
    if (err.code === "23505" && err.constraint === "idx_offer_groups_unique_active_generic") {
      return res.status(400).json({ status: "FAILED", error: "An active generic offer group already exists for that Geo/Carrier." });
    }
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ── DELETE GROUP — must be paused first ────────── */
router.delete("/offer-groups/:id", orgAuth, async (req, res) => {
  try {
    const g = await pool.query(`SELECT status FROM offer_groups WHERE id = $1 AND org_id = $2`, [req.params.id, req.orgId]);
    if (!g.rows.length) return res.status(404).json({ status: "FAILED", error: "Group not found" });
    if (g.rows[0].status === "active") {
      return res.status(400).json({ status: "FAILED", error: "Pause this offer group before deleting it." });
    }
    await pool.query(`DELETE FROM offer_groups WHERE id=$1 AND org_id=$2`, [req.params.id, req.orgId]);
    res.json({ status: "SUCCESS" });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* ── WEIGHTED RANDOM ROUTER ─────────────────────── */
// This is used internally by resolveTrafficOffer() in publisher.routes.js
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

  const total = items.rows.reduce((s, r) => s + Number(r.weight), 0);
  let rand = Math.random() * total;

  for (const row of items.rows) {
    rand -= Number(row.weight);
    if (rand <= 0) return row.offer_id;
  }

  return items.rows[0].offer_id;
}

export default router;
