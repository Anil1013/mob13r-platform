import express from "express";
import pool from "../db.js";

const router = express.Router();

/* ==========================
   MIDDLEWARES
========================== */

// pub_id required in query
const validatePubId = (req, res, next) => {
  const { pub_id } = req.query;
  if (!pub_id || typeof pub_id !== "string" || pub_id.trim() === "") {
    return res.status(400).json({ error: "pub_id is required" });
  }
  next();
};

// For POST /rules – basic required fields
const validateRuleCreate = (req, res, next) => {
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

  if (!pub_id || !publisher_name || !tracking_link_id) {
    return res
      .status(400)
      .json({ error: "pub_id, publisher_name, tracking_link_id are required" });
  }

  if (!offer_id || !offer_name) {
    return res.status(400).json({ error: "offer_id and offer_name required" });
  }

  if (!redirect_url) {
    return res.status(400).json({ error: "redirect_url is required" });
  }

  // optional: basic type checks
  if (weight !== undefined && isNaN(Number(weight))) {
    return res.status(400).json({ error: "weight must be a number" });
  }

  next();
};

// For PUT /rules/:id – at least one updatable field required
const validateRuleUpdate = (req, res, next) => {
  const allowedFields = [
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

  const hasAnyField = allowedFields.some(
    (field) => req.body[field] !== undefined
  );

  if (!hasAnyField) {
    return res
      .status(400)
      .json({ error: "At least one field must be provided to update" });
  }

  if (req.body.weight !== undefined && isNaN(Number(req.body.weight))) {
    return res.status(400).json({ error: "weight must be a number" });
  }

  next();
};

/* ==========================
    GET META
============================ */
router.get("/meta", validatePubId, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const publisher = await pool.query(
      `SELECT * FROM publishers WHERE pub_id = $1`,
      [pub_id]
    );

    const trackingLinks = await pool.query(
      `SELECT id, link_name 
       FROM tracking_links 
       WHERE pub_id = $1
       ORDER BY id DESC`,
      [pub_id]
    );

    const offers = await pool.query(
      `SELECT offer_id, offer_name 
       FROM offers
       ORDER BY offer_id ASC`
    );

    res.json({
      publisher: publisher.rows[0] || null,
      trackingLinks: trackingLinks.rows,
      offers: offers.rows,
    });
  } catch (err) {
    console.error("META Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================
    GET RULES
============================ */
router.get("/rules", validatePubId, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const rules = await pool.query(
      `SELECT * 
       FROM traffic_rules 
       WHERE pub_id = $1 
       ORDER BY id DESC`,
      [pub_id]
    );

    res.json(rules.rows);
  } catch (err) {
    console.error("Get Rules Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================
    GET REMAINING OFFERS
============================ */
router.get("/rules/remaining", validatePubId, async (req, res) => {
  try {
    const { pub_id } = req.query;

    // offers already used in rules for this publisher
    const used = await pool.query(
      `SELECT offer_id 
       FROM traffic_rules 
       WHERE pub_id = $1`,
      [pub_id]
    );

    const usedIds = used.rows.map((r) => r.offer_id);

    let remaining;

    if (usedIds.length === 0) {
      // nothing used yet → return all offers
      remaining = await pool.query(
        `SELECT offer_id, offer_name 
         FROM offers
         ORDER BY offer_id ASC`
      );
    } else {
      // build dynamic placeholders: $1, $2, ...
      const placeholders = usedIds.map((_, i) => `$${i + 1}`).join(", ");
      remaining = await pool.query(
        `SELECT offer_id, offer_name 
         FROM offers 
         WHERE offer_id NOT IN (${placeholders})
         ORDER BY offer_id ASC`,
        usedIds
      );
    }

    res.json(remaining.rows);
  } catch (err) {
    console.error("Remaining Offers Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================
    GET OFFERS (Exclude One)
    ?exclude=OFF02
============================ */
router.get("/offers", async (req, res) => {
  try {
    const { exclude } = req.query;

    let result;

    if (!exclude) {
      result = await pool.query(
        `SELECT offer_id, offer_name 
         FROM offers
         ORDER BY offer_id ASC`
      );
    } else {
      result = await pool.query(
        `SELECT offer_id, offer_name 
         FROM offers 
         WHERE offer_id != $1
         ORDER BY offer_id ASC`,
        [exclude]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Offers Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================
    CREATE RULE
============================ */
router.post("/rules", validateRuleCreate, async (req, res) => {
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
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,
        $10,$11,$12
      )
      RETURNING *
      `,
      [
        pub_id,
        publisher_name,
        tracking_link_id,
        geo,
        carrier,
        offer_id, // varchar → OFF02, OFF03 etc
        offer_name,
        advertiser_name,
        redirect_url,
        type,
        weight,
        status,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Create Rule Error:", err);
    res.status(500).json({ error: "Insert Failed" });
  }
});

/* ==========================
    UPDATE RULE (OFFER FIXED)
============================ */
router.put("/rules/:id", validateRuleUpdate, async (req, res) => {
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

    const updates = [];
    const values = [];
    let index = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        // 🔥 IMPORTANT: keep offer_id as varchar, don't let it behave like number
        if (field === "offer_id") {
          updates.push(`offer_id = $${index}::varchar`);
        } else {
          updates.push(`${field} = $${index}`);
        }

        values.push(req.body[field]);
        index++;
      }
    }

    values.push(id);

    const result = await pool.query(
      `
      UPDATE traffic_rules
      SET ${updates.join(", ")}
      WHERE id = $${index}
      RETURNING *
      `,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update Rule Error:", err);
    res.status(500).json({ error: "Update Failed" });
  }
});

/* ==========================
    DELETE RULE
============================ */
router.delete("/rules/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM traffic_rules WHERE id = $1`, [
      req.params.id,
    ]);

    res.json({ success: true, message: "Rule deleted" });
  } catch (err) {
    console.error("Delete Rule Error:", err);
    res.status(500).json({ error: "Delete Failed" });
  }
});

export default router;
