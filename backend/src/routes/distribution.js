import express from "express";
import db from "../db.js";   // 🔥 Correct path
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// --------------------------
// GET META
// --------------------------
router.get("/meta", authMiddleware, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const publisher = await db.oneOrNone(
      `SELECT * FROM publishers WHERE pub_id = $1`,
      [pub_id]
    );

    if (!publisher) {
      return res.status(404).json({ error: "Publisher not found" });
    }

    const trackingLinks = await db.manyOrNone(
      `SELECT id, link_name FROM tracking_links WHERE pub_id = $1`,
      [pub_id]
    );

    const offers = await db.manyOrNone(
      `SELECT offer_id, offer_name FROM offers`
    );

    res.json({
      publisher,
      trackingLinks,
      offers
    });
  } catch (err) {
    console.error("META Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------
// GET RULES
// --------------------------
router.get("/rules", authMiddleware, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const rules = await db.manyOrNone(
      `SELECT * FROM traffic_rules WHERE pub_id = $1 ORDER BY id DESC`,
      [pub_id]
    );

    res.json(rules);
  } catch (err) {
    console.error("Get Rules Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------
// GET REMAINING OFFERS
// --------------------------
router.get("/rules/remaining", authMiddleware, async (req, res) => {
  try {
    const { pub_id } = req.query;

    const usedOffers = await db.manyOrNone(
      `SELECT offer_id FROM traffic_rules WHERE pub_id = $1`,
      [pub_id]
    );

    const usedOfferIds = usedOffers.map(o => o.offer_id);

    const remaining = await db.manyOrNone(
      `SELECT offer_id, offer_name FROM offers WHERE offer_id NOT IN ($1:list)`,
      [usedOfferIds.length ? usedOfferIds : ["NONE"]]
    );

    res.json(remaining);
  } catch (err) {
    console.error("Remaining Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------
// GET OFFERS (Exclude)
// --------------------------
router.get("/offers", authMiddleware, async (req, res) => {
  try {
    const exclude = req.query.exclude;

    const offers = await db.manyOrNone(
      `SELECT offer_id, offer_name FROM offers WHERE offer_id != $1`,
      [exclude]
    );

    res.json(offers);
  } catch (err) {
    console.error("Offers Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------
// UPDATE RULE
// --------------------------
router.put("/rules/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      geo, carrier, offer_id, type, weight, status,
      redirect_url
    } = req.body;

    const updated = await db.one(
      `UPDATE traffic_rules 
       SET geo=$1, carrier=$2, offer_id=$3, type=$4, weight=$5, status=$6, redirect_url=$7 
       WHERE id=$8 RETURNING *`,
      [geo, carrier, offer_id, type, weight, status, redirect_url, id]
    );

    res.json(updated);
  } catch (err) {
    console.error("Update Rule Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --------------------------
export default router;
