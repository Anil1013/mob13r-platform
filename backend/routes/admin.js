import express from "express";
import { sequelize, initModels } from "../models.js";
import seed from "../seed.js";

const router = express.Router();

// ✅ Initialize models
const { Partner, Offer, Affiliate, Track } = initModels();

/**
 * 🟢 Fetch all partners
 */
router.get("/partners", async (req, res) => {
  try {
    const partners = await Partner.findAll();
    res.json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

/**
 * 🟢 Fetch all affiliates (password hidden)
 */
router.get("/affiliates", async (req, res) => {
  try {
    const affiliates = await Affiliate.findAll({
      attributes: { exclude: ["password"] },
    });
    res.json(affiliates);
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    res.status(500).json({ error: "Failed to fetch affiliates" });
  }
});

/**
 * 🟢 Fetch all offers (with partner info)
 */
router.get("/offers", async (req, res) => {
  try {
    const offers = await Offer.findAll({ include: [Partner] });
    res.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

/**
 * 🟢 Create a new offer
 */
router.post("/offers", async (req, res) => {
  try {
    const {
      name,
      geo,
      carrier,
      partner_id,
      partner_cpa,
      affiliate_cpa,
      ref_url,
      request_url,
      verify_url,
    } = req.body;

    if (!name || !partner_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newOffer = await Offer.create({
      name,
      geo,
      carrier,
      PartnerId: partner_id,
      partner_cpa,
      affiliate_cpa,
      ref_url,
      request_url,
      verify_url,
      status: "active",
    });

    res.status(201).json(newOffer);
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ error: "Failed to create offer" });
  }
});

/**
 * 🟢 Delete an offer by ID
 */
router.delete("/offers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Offer.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ error: "Offer not found" });
    }
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ error: "Failed to delete offer" });
  }
});

/**
 * 🟢 Trigger DB seeding manually
 */
router.get("/seed", async (req, res) => {
  try {
    await seed();
    res.json({ message: "✅ Database seeded successfully!" });
  } catch (err) {
    console.error("Error in seeding:", err);
    res.status(500).json({ error: "Failed to seed database" });
  }
});

/**
 * 📊 Reports API — Partner + Affiliate + Offer + Track Data
 * Filters: date range, partner_id, affiliate_id, offer_id, status
 */
router.get("/reports", async (req, res) => {
  try {
    const { start_date, end_date, partner_id, affiliate_id, offer_id, status } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.date = { [sequelize.Op.between]: [start_date, end_date] };
    }
    if (partner_id) where.PartnerId = partner_id;
    if (affiliate_id) where.AffiliateId = affiliate_id;
    if (offer_id) where.OfferId = offer_id;

    const reportData = await Track.findAll({
      where,
      include: [
        { model: Partner, attributes: ["id", "name", "country"] },
        { model: Offer, attributes: ["id", "name", "geo", "carrier", "partner_cpa", "affiliate_cpa", "status"] },
        { model: Affiliate, attributes: ["id", "name", "email"] },
      ],
      attributes: [
        "date",
        [sequelize.fn("SUM", sequelize.col("clicks")), "clicks"],
        [sequelize.fn("SUM", sequelize.col("conversions")), "conversions"],
      ],
      group: ["Track.date", "Partner.id", "Affiliate.id", "Offer.id"],
      raw: true,
      nest: true,
    });

    const reports = reportData.map((item) => {
      const revenue = item.conversions * item.Offer.partner_cpa;
      const payout = item.conversions * item.Offer.affiliate_cpa;
      return {
        date: item.date,
        partner: item.Partner.name,
        affiliate: item.Affiliate.name,
        offer: item.Offer.name,
        clicks: item.clicks,
        conversions: item.conversions,
        partner_cpa: item.Offer.partner_cpa,
        affiliate_cpa: item.Offer.affiliate_cpa,
        revenue,
        payout,
        profit: revenue - payout,
        status: item.Offer.status,
      };
    });

    res.json(reports);
  } catch (error) {
    console.error("Error generating reports:", error);
    res.status(500).json({ error: "Failed to generate reports" });
  }
});

export default router;
