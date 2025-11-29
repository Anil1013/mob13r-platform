import express from "express";
import pool from "../db.js";
import authJWT from "../middleware/authJWT.js";

const router = express.Router();

/* ============================================================
   UNIVERSAL URL PARAM BUILDER (publisher + backend params)
============================================================ */
function buildDynamicUrl(baseUrl, req, extraParams = {}) {
  try {
    const url = new URL(baseUrl);

    // 1) Publisher sent parameters (sub1, sub2, msisdn, ua etc)
    Object.keys(req.query).forEach((key) => {
      if (req.query[key] !== undefined && req.query[key] !== "") {
        url.searchParams.set(key, req.query[key]);
      }
    });

    // 2) Backend auto parameters
    const backendParams = {
      click_id: "CLK" + Date.now(),
      ip: req.ip,
      ua: req.headers["user-agent"],
      device: req.headers["user-agent"],
      time: Date.now(),
      ...extraParams
    };

    Object.keys(backendParams).forEach((key) => {
      if (backendParams[key] !== undefined && backendParams[key] !== null) {
        url.searchParams.set(key, backendParams[key]);
      }
    });

    return url.toString();

  } catch (err) {
    console.error("URL BUILD ERROR:", err);
    return baseUrl;
  }
}

/* ============================================================
   1️⃣ META API — Publisher + Tracking + Active Offers + Rules
============================================================ */
router.get("/meta", authJWT, async (req, res) => {
  try {
    const { pub_id } = req.query;

    if (!pub_id)
      return res.json({ success: false, message: "pub_id missing" });

    // 1) Load publisher (using pub_code)
    const pub = await pool.query(
      `SELECT * FROM publishers WHERE pub_code = $1`,
      [pub_id]
    );

    if (!pub.rows.length)
      return res.json({ success: false, message: "Publisher not found!" });

    const publisher = pub.rows[0];

    // 2) Load tracking table
    const tracking = await pool.query(
      `
      SELECT *
      FROM tracking
      WHERE pub_code = $1
      `,
      [pub_id]
    );

    // 3) Load active offers for this GEO + Carrier
    const offers = await pool.query(
      `
      SELECT *
      FROM offers
      WHERE status='active'
      ORDER BY offer_id ASC
      `
    );

    // 4) Traffic Rules for this publisher
    const rules = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1
      ORDER BY weight DESC, id DESC
      `,
      [pub_id]
    );

    res.json({
      success: true,
      publisher,
      tracking: tracking.rows,
      offers: offers.rows,
      rules: rules.rows,
    });

  } catch (err) {
    console.error("META ERROR:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
   2️⃣ GET RULES
============================================================ */
router.get("/rules", authJWT, async (req, res) => {
  try {
    const { pub_id, tracking_link_id } = req.query;

    const result = await pool.query(
      `
      SELECT *
      FROM traffic_rules
      WHERE pub_id = $1 AND tracking_link_id = $2
      ORDER BY weight DESC, id DESC
      `,
      [pub_id, tracking_link_id]
    );

    res.json({ success: true, rules: result.rows });

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
        offer_id, offer_name, advertiser_name,
        redirect_url, type, weight, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        pub_id, publisher_name, tracking_link_id, geo, carrier,
        offer_id, offer_name, advertiser_name,
        redirect_url, type, weight, status
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
      WHERE pub_id = $1 AND tracking_link_id = $2
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
   7️⃣ NEXT ENGINE — TRAFFIC DISTRIBUTION
============================================================ */
router.get("/next", async (req, res) => {
  try {
    const { pub_id, tracking_link_id, geo, carrier } = req.query;

    /* -----------------------
       TRACKING FOR PUBLISHER
    -------------------------*/
    const tracking = await pool.query(
      `
      SELECT * FROM tracking 
      WHERE pub_code = $1
      `,
      [pub_id]
    );

    if (!tracking.rows.length)
      return res.json({ url: "NO_TRACKING_FOUND" });

    const publisherTrack = tracking.rows[0];

    /* -----------------------
       LOAD TRAFFIC RULES
    -------------------------*/
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

    if (!rules.rows.length) {
      // if no rule → send publisher tracking URL
      const finalUrl = buildDynamicUrl(publisherTrack.tracking_url, req);
      return res.json({ url: finalUrl });
    }

    /* -----------------------
       VALID OFFERS (CAP ready)
    -------------------------*/
    const validOffers = [];

    for (const r of rules.rows) {
      const offer = await pool.query(
        `SELECT * FROM offers WHERE offer_id=$1 AND status='active'`,
        [r.offer_id]
      );

      if (!offer.rows.length) continue;

      validOffers.push({ rule: r, offer: offer.rows[0] });
    }

    if (!validOffers.length) {
      const fallbackUrl = buildDynamicUrl(publisherTrack.tracking_url, req);
      return res.json({ url: fallbackUrl });
    }

    /* -----------------------
       WEIGHT BASED SELECTION
    -------------------------*/
    const totalWeight = validOffers.reduce(
      (sum, o) => sum + o.rule.weight,
      0
    );

    let random = Math.random() * totalWeight;
    let selected = null;

    for (const v of validOffers) {
      if (random < v.rule.weight) {
        selected = v;
        break;
      }
      random -= v.rule.weight;
    }

    if (!selected) selected = validOffers[0];

    /* -----------------------
       FINAL OFFER REDIRECT
    -------------------------*/
    const finalUrl = buildDynamicUrl(selected.offer.tracking_url, req, {
      offer_id: selected.offer.offer_id,
      advertiser: selected.offer.advertiser_name,
      payout: selected.offer.payout,
      geo,
      carrier
    });

    res.json({ url: finalUrl });

  } catch (err) {
    console.error("NEXT ENGINE ERROR:", err);
    res.json({ url: "ERROR" });
  }
});

export default router;
