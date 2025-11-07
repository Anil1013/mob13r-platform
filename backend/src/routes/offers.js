import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ✅ Get All Offers (with Advertiser Name) */
router.get("/", authJWT, async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*, 
        a.name AS advertiser_name
      FROM offers o
      LEFT JOIN advertisers a ON o.advertiser_id = a.id
      ORDER BY o.id DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching offers:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ✅ Add New Offer */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      name,
      geo,
      carrier,
      type,
      advertiser_id,
      advertiser_payout,
      publisher_payout,
      cap_daily = 0,
      click_url,
      api_base_url,
      flow_type = "direct",
      status = "active"
    } = req.body;

    if (!name || !advertiser_id || !advertiser_payout)
      return res.status(400).json({ error: "Missing required fields" });

    // auto calculate publisher payout if not provided
    const pubPayout =
      publisher_payout || parseFloat((advertiser_payout * 0.8).toFixed(2));

    const result = await pool.query(
      `INSERT INTO offers 
      (name, geo, carrier, type, advertiser_id, advertiser_payout, publisher_payout, cap_daily, click_url, api_base_url, flow_type, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        name,
        geo,
        carrier,
        type,
        advertiser_id,
        advertiser_payout,
        pubPayout,
        cap_daily,
        click_url,
        api_base_url,
        flow_type,
        status,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding offer:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ✅ Update Offer */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      geo,
      carrier,
      type,
      advertiser_id,
      advertiser_payout,
      publisher_payout,
      cap_daily,
      click_url,
      api_base_url,
      flow_type,
      status,
    } = req.body;

    const pubPayout =
      publisher_payout || parseFloat((advertiser_payout * 0.8).toFixed(2));

    const q = `
      UPDATE offers
      SET name=$1, geo=$2, carrier=$3, type=$4, advertiser_id=$5, advertiser_payout=$6,
      publisher_payout=$7, cap_daily=$8, click_url=$9, api_base_url=$10, flow_type=$11, status=$12
      WHERE id=$13
      RETURNING *`;

    const { rows } = await pool.query(q, [
      name,
      geo,
      carrier,
      type,
      advertiser_id,
      advertiser_payout,
      pubPayout,
      cap_daily,
      click_url,
      api_base_url,
      flow_type,
      status,
      id,
    ]);

    if (rows.length === 0)
      return res.status(404).json({ error: "Offer not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating offer:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ✅ Delete Offer */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM offers WHERE id=$1", [id]);
    res.json({ message: "Offer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
