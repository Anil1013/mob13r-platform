import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ============================================================
   🟢 GET ALL OFFERS (with Advertiser + Publisher Names)
   ============================================================ */
router.get("/", authJWT, async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*, 
        a.name AS advertiser_name,
        p.name AS publisher_name
      FROM offers o
      LEFT JOIN advertisers a ON o.advertiser_id = a.id
      LEFT JOIN publishers p ON o.publisher_id = p.id
      ORDER BY o.id DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching offers:", err.message);
    res.status(500).json({ error: "Failed to fetch offers", details: err.message });
  }
});

/* ============================================================
   🟢 ADD NEW OFFER
   ============================================================ */
router.post("/", authJWT, async (req, res) => {
  try {
    const {
      name,
      geo,
      carrier,
      type,
      advertiser_id,
      publisher_id,
      advertiser_payout,
      publisher_payout,
      cap_daily = 0,
      flow_type = "normal",
      click_url = null,
      postback_url = null,
      pin_send_url = null,
      pin_verify_url = null,
      status_check_url = null,
      portal_url = null,
      status = "active",
    } = req.body;

    // Validation
    if (!name || !advertiser_id || !advertiser_payout)
      return res.status(400).json({ error: "Missing required fields" });

    // Validate advertiser existence
    const advCheck = await pool.query("SELECT id FROM advertisers WHERE id=$1", [advertiser_id]);
    if (advCheck.rowCount === 0)
      return res.status(400).json({ error: "Invalid advertiser_id" });

    // Calculate publisher payout automatically (default 80%)
    const pubPayout = publisher_payout
      ? parseFloat(publisher_payout)
      : parseFloat((advertiser_payout * 0.8).toFixed(2));

    const result = await pool.query(
      `INSERT INTO offers 
      (name, geo, carrier, type, advertiser_id, publisher_id,
       advertiser_payout, publisher_payout, cap_daily, flow_type, 
       click_url, postback_url, pin_send_url, pin_verify_url, 
       status_check_url, portal_url, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        name, geo, carrier, type, advertiser_id, publisher_id,
        advertiser_payout, pubPayout, cap_daily, flow_type,
        click_url, postback_url, pin_send_url, pin_verify_url,
        status_check_url, portal_url, status,
      ]
    );

    res.json({
      message: "✅ Offer created successfully",
      offer: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error adding offer:", err.message);
    res.status(500).json({ error: "Failed to add offer", details: err.message });
  }
});

/* ============================================================
   🟡 UPDATE OFFER
   ============================================================ */
router.put("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      geo,
      carrier,
      type,
      advertiser_id,
      publisher_id,
      advertiser_payout,
      publisher_payout,
      cap_daily,
      flow_type,
      click_url,
      postback_url,
      pin_send_url,
      pin_verify_url,
      status_check_url,
      portal_url,
      status,
    } = req.body;

    const pubPayout =
      publisher_payout || parseFloat((advertiser_payout * 0.8).toFixed(2));

    const q = `
      UPDATE offers
      SET name=$1, geo=$2, carrier=$3, type=$4, advertiser_id=$5, publisher_id=$6,
          advertiser_payout=$7, publisher_payout=$8, cap_daily=$9, flow_type=$10,
          click_url=$11, postback_url=$12, pin_send_url=$13, pin_verify_url=$14,
          status_check_url=$15, portal_url=$16, status=$17, updated_at=NOW()
      WHERE id=$18
      RETURNING *`;

    const { rows } = await pool.query(q, [
      name,
      geo,
      carrier,
      type,
      advertiser_id,
      publisher_id,
      advertiser_payout,
      pubPayout,
      cap_daily,
      flow_type,
      click_url,
      postback_url,
      pin_send_url,
      pin_verify_url,
      status_check_url,
      portal_url,
      status,
      id,
    ]);

    if (rows.length === 0)
      return res.status(404).json({ error: "Offer not found" });

    res.json({
      message: "✅ Offer updated successfully",
      offer: rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating offer:", err.message);
    res.status(500).json({ error: "Failed to update offer", details: err.message });
  }
});

/* ============================================================
   🔴 DELETE OFFER
   ============================================================ */
router.delete("/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const del = await pool.query("DELETE FROM offers WHERE id=$1 RETURNING id", [id]);

    if (del.rowCount === 0)
      return res.status(404).json({ error: "Offer not found" });

    res.json({ message: "🗑️ Offer deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting offer:", err.message);
    res.status(500).json({ error: "Failed to delete offer", details: err.message });
  }
});

export default router;
