import express from "express";
import { sequelize, initModels } from "../models.js";
import seed from "../seed.js";

const router = express.Router();

// Initialize models
const { Partner, Offer, Affiliate } = initModels();

/**
 * ✅ Fetch all partners
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
 * ✅ Fetch all affiliates (without passwords)
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
 * ✅ Fetch all offers (with partner info)
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
 * ✅ Reports (Daily or Hourly Summary)
 */
router.get("/reports", async (req, res) => {
  try {
    const { start_date, end_date, group = "daily", start_hour, end_hour } = req.query;

    // Fake demo data generator (replace later with DB aggregation)
    const days = 7;
    const today = new Date();

    if (group === "hourly") {
      const data = [];
      for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - d);
        for (let h = 0; h < 24; h++) {
          // Apply hour range filter
          if (
            (start_hour && h < parseInt(start_hour)) ||
            (end_hour && h > parseInt(end_hour))
          )
            continue;

          data.push({
            date: date.toISOString().split("T")[0],
            hour: h,
            total_affiliates: 2,
            total_partners: 2,
            total_offers: 4,
          });
        }
      }
      return res.json(data);
    } else {
      // Daily summary
      const data = [];
      for (let d = 0; d < days; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - d);
        data.push({
          date: date.toISOString().split("T")[0],
          total_affiliates: 2,
          total_partners: 2,
          total_offers: 4,
        });
      }
      return res.json(data);
    }
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

/**
 * ✅ Create a new offer
 */
router.post("/offers", async (req, res) => {
  try {
    const {
      name,
      geo,
      carrier,
      partner_id,
      partner_cpa,
      ref_url,
      request_url,
      verify_url,
    } = req.body;

    if (!name || !partner_id)
      return res.status(400).json({ error: "Missing required fields" });

    const newOffer = await Offer.create({
      name,
      geo,
      carrier,
      PartnerId: partner_id,
      partner_cpa,
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
 * ✅ Delete an offer by ID
 */
router.delete("/offers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Offer.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Offer not found" });
    res.json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ error: "Failed to delete offer" });
  }
});

/**
 * ✅ Trigger DB seeding manually
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

export default router;
