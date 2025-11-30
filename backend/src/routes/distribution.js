import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ============================================================
   GET META FROM TRACKING TABLE
============================================================ */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id)
      return res.json({ success: false, message: "pub_id required" });

    const q = `
      SELECT 
        id,
        pub_id,
        publisher_name,
        geo,
        carrier,
        url AS tracking_url
      FROM tracking
      WHERE pub_id = $1
      ORDER BY id DESC
    `;

    const track = await pool.query(q, [pub_id]);

    return res.json({
      success: true,
      meta: track.rows,
    });

  } catch (e) {
    console.error("META ERROR:", e);
    return res.status(500).json({ success: false });
  }
});

/* ============================================================
   GET TRAFFIC RULES
============================================================ */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const q = `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY weight DESC, id DESC
    `;

    const rules = await pool.query(q, [pub_id]);

    return res.json({ success: true, rules: rules.rows });

  } catch (e) {
    console.error("RULES ERROR:", e);
    return res.status(500).json({ success: false });
  }
});

/* ============================================================
   CREATE RULE
============================================================ */
router.post("/rules", authJWT, async (req, res) => {
  try {
    const {
      pub_id,
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
      status
    } = req.body;

    const q = `
      INSERT INTO traffic_rules (
        pub_id, publisher_name, tracking_link_id,
        geo, carrier, offer_id, offer_name,
        advertiser_name, redirect_url, type, weight, status
      )
      VALUES (
        $1,$2,$3,
        $4,$5,$6,$7,
        $8,$9,$10,$11,$12
      )
      RETURNING *
    `;

    const r = await pool.query(q, [
      pub_id, publisher_name, tracking_link_id,
      geo, carrier, offer_id, offer_name,
      advertiser_name, redirect_url, type, weight, status
    ]);

    return res.json({ success: true, rule: r.rows[0] });

  } catch (e) {
    console.error("CREATE RULE ERROR:", e);
    return res.status(500).json({ success: false });
  }
});

/* ============================================================
   UPDATE RULE
============================================================ */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const ruleId = req.params.id;

    const allowed = [
      "geo", "carrier", "offer_id", "offer_name",
      "advertiser_name", "redirect_url",
      "type", "weight", "status"
    ];

    const updates = [];
    const values = [];
    let i = 1;

    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${i}`);
        values.push(req.body[f]);
        i++;
      }
    }

    values.push(ruleId);

    const q = `
      UPDATE traffic_rules
      SET ${updates.join(", ")}
      WHERE id = $${i}
      RETURNING *
    `;

    const r = await pool.query(q, values);

    return res.json({ success: true, rule: r.rows[0] });

  } catch (e) {
    console.error("UPDATE RULE ERROR:", e);
    return res.status(500).json({ success: false });
  }
});

/* ============================================================
   DELETE RULE
============================================================ */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    const ruleId = req.params.id;

    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [ruleId]);

    return res.json({ success: true });

  } catch (e) {
    console.error("DELETE RULE ERROR:", e);
    return res.status(500).json({ success: false });
  }
});

/* ============================================================
   GET ACTIVE OFFERS FOR DROPDOWN
============================================================ */
router.get("/offers", authJWT, async (req, res) => {
  try {
    const { geo, carrier } = req.query;

    const q = `
      SELECT 
        offer_id,
        name AS offer_name,
        advertiser_name
      FROM offers
      WHERE geo = $1
      AND carrier = $2
      AND status = 'active'
      ORDER BY id DESC
    `;

    const offers = await pool.query(q, [geo, carrier]);

    return res.json({ success: true, offers: offers.rows });

  } catch (e) {
    console.error("OFFERS ERROR:", e);
    return res.status(500).json({ success: false });
  }
});

export default router;
