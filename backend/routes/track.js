import express from "express";
import { sequelize, initModels } from "../models.js";

const router = express.Router();
const { Track, Partner, Offer, Affiliate } = initModels();

/**
 * ✅ Track Click
 */
router.post("/click", async (req, res) => {
  try {
    const { offer_id, affiliate_id, partner_id } = req.body;

    if (!offer_id || !affiliate_id || !partner_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const click = await Track.create({
      OfferId: offer_id,
      AffiliateId: affiliate_id,
      PartnerId: partner_id,
      clicks: 1,
      conversions: 0,
      date: new Date(),
    });

    res.json({ message: "Click tracked", click });
  } catch (error) {
    console.error("Error tracking click:", error);
    res.status(500).json({ error: "Failed to track click" });
  }
});

/**
 * ✅ Track Conversion
 */
router.post("/conversion", async (req, res) => {
  try {
    const { offer_id, affiliate_id, partner_id } = req.body;

    if (!offer_id || !affiliate_id || !partner_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const conversion = await Track.create({
      OfferId: offer_id,
      AffiliateId: affiliate_id,
      PartnerId: partner_id,
      clicks: 0,
      conversions: 1,
      date: new Date(),
    });

    res.json({ message: "Conversion tracked", conversion });
  } catch (error) {
    console.error("Error tracking conversion:", error);
    res.status(500).json({ error: "Failed to track conversion" });
  }
});

/**
 * 📊 Reports API — with filters and calculations
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

    // Fetch all tracking data joined with related tables
    const reportData = await Track.findAll({
      where,
      include: [
        { model: Partner, attributes: ["id", "name", "country"] },
        { model: Offer, attributes: ["id", "name", "partner_cpa", "affiliate_cpa", "status"] },
        { model: Affiliate, attributes: ["id", "name", "email"] },
      ],
      attributes: [
        "date",
        [sequelize.fn("SUM", sequelize.col("clicks")), "clicks"],
        [sequelize.fn("SUM", sequelize.col("conversions")), "conversions"],
      ],
      group: ["Track.date", "Partner.id", "Offer.id", "Affiliate.id"],
      raw: true,
      nest: true,
    });

    // Add computed values
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
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

export default router;

