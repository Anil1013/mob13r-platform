import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ============================================================
   UNIVERSAL URL BUILDER (auto add params to tracking_url)
============================================================ */
function buildUrl(baseUrl, params = {}) {
  try {
    const url = new URL(baseUrl);

    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, params[key]);
      }
    });

    return url.toString();
  } catch (err) {
    console.error("URL BUILD ERROR:", err);
    return baseUrl;
  }
}

/* ============================================================
   1️⃣ META  →  offers + tracking (publisher based)
============================================================ */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id) return res.json({ success: false, message: "pub_id missing" });

    // Get all active offers
    const offers = await pool.query(`
      SELECT 
        offer_id, 
        name AS offer_name, 
        advertiser_name, 
        payout, 
        cap_daily, 
        cap_total
      FROM offers
      WHERE status = 'active'
      ORDER BY offer_id ASC
    `);

    // Get tracking settings
    const tracking = await pool.query(
      `
      SELECT 
        id, 
        pub_id, 
        tracking_url, 
        cap_daily, 
        cap_total
      FROM tracking
      WHERE pub_id = $1
      `,
      [pub_id]
    );

    res.json({
      success: true,
      offers: offers.rows,
      tracking: tracking.rows,
    });
  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   2️⃣ GET RULES (by pub_id + tracking_link_id)
============================================================ */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const rules = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1 
        AND tracking_link_id = $2
      ORDER BY weight DESC, id DESC
      `,
      [pub_id, tracking_link_id]
    );

    res.json({ success: true, rules: rules.rows });
  } catch (err) {
    console.error("RULES ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   3️⃣ CREATE RULE
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
      status,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO traffic_rules (
        pub_id, publisher_name, tracking_link_id, geo, carrier,
        offer_id, offer_name, advertiser_name, redirect_url,
        type, weight, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
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
        status,
      ]
    );

    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    console.error("CREATE RULE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   4️⃣ UPDATE RULE
============================================================ */
router.put("/rules/:id", authJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const fields = [
      "geo",
      "carrier",
      "offer_id",
      "offer_name",
      "advertiser_name",
      "redirect_url",
      "type",
      "weight",
      "status",
    ];

    const sets = [];
    const values = [];
    let i = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = $${i}`);
        values.push(req.body[field]);
        i++;
      }
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE traffic_rules SET ${sets.join(", ")}
       WHERE id = $${i}
       RETURNING *`,
      values
    );

    res.json({ success: true, rule: result.rows[0] });
  } catch (err) {
    console.error("UPDATE RULE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   5️⃣ DELETE RULE
============================================================ */
router.delete("/rules/:id", authJWT, async (req, res) => {
  try {
    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [
      req.params.id,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE RULE ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   6️⃣ REMAINING WEIGHT
============================================================ */
router.get("/rules/remaining", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const result = await pool.query(
      `
      SELECT COALESCE(SUM(weight),0) AS used
      FROM traffic_rules
      WHERE pub_id = $1 
        AND tracking_link_id = $2
      `,
      [pub_id, tracking_link_id]
    );

    const used = parseInt(result.rows[0].used);
    const remaining = 100 - used;

    res.json({ success: true, used, remaining });
  } catch (err) {
    console.error("WEIGHT ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   7️⃣ NEXT CLICK ENGINE (MAIN TRAFFIC LOGIC)
============================================================ */
router.get("/next", async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier } = req.query;

    /* ---------------------------
         1) Load Tracking
    ----------------------------*/
    const tracking = await pool.query(
      `
      SELECT tracking_url, cap_daily, cap_total
      FROM tracking
      WHERE pub_id = $1
      `,
      [pub_id]
    );

    if (!tracking.rows.length)
      return res.json({ url: "NO_TRACKING_FOUND" });

    const publisherTrack = tracking.rows[0];

    /* ---------------------------
         2) Load Rules
    ----------------------------*/
    const rules = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
        AND tracking_link_id = $2
        AND geo = $3
        AND carrier = $4
      ORDER BY weight DESC
      `,
      [pub_id, tracking_link_id, geo, carrier]
    );

    if (!rules.rows.length)
      return res.json({ url: publisherTrack.tracking_url });

    /* ---------------------------
         3) Validate Offers (CAP handling)
    ----------------------------*/
    const validOffers = [];

    for (const r of rules.rows) {
      const offer = await pool.query(
        `
        SELECT *
        FROM offers
        WHERE offer_id = $1
          AND status = 'active'
        `,
        [r.offer_id]
      );

      if (!offer.rows.length) continue;

      const o = offer.rows[0];

      // (Future: CAP usage check add kar denge)
      validOffers.push({ rule: r, offer: o });
    }

    if (!validOffers.length)
      return res.json({ url: publisherTrack.tracking_url });

    /* ---------------------------
         4) Weight Rotation
    ----------------------------*/
    const totalWeight = validOffers.reduce(
      (sum, vo) => sum + vo.rule.weight,
      0
    );

    let random = Math.random() * totalWeight;

    let selected = null;

    for (const vo of validOffers) {
      if (random < vo.rule.weight) {
        selected = vo;
        break;
      }
      random -= vo.rule.weight;
    }

    if (!selected) selected = validOffers[0];

    /* ---------------------------
         5) CLICK ID + PARAMETER BUILDING
    ----------------------------*/
    const clickId = "CLK" + Date.now();

    const finalUrl = buildUrl(selected.offer.tracking_url, {
      click_id: clickId,
      offer_id: selected.offer.offer_id,
      pub_id,
      tracking_id: tracking_link_id,
      geo,
      carrier,
      payout: selected.offer.payout,
      offer_name: selected.offer.name,
      advertiser_name: selected.offer.advertiser_name,
    });

    res.json({ url: finalUrl });
  } catch (err) {
    console.error("NEXT ENGINE ERROR:", err);
    res.json({ url: "ERROR" });
  }
});

export default router;
