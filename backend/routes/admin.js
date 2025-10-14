import express from "express";
import { sequelize, initModels } from "../models.js";
import seed from "../seed.js";

const router = express.Router();

// Initialize models
const { Partner, Offer, Affiliate } = initModels();

/* -------------------------------------------------------------------------- */
/* ✅ BASIC CRUD ROUTES                                                       */
/* -------------------------------------------------------------------------- */

router.get("/partners", async (req, res) => {
  try {
    const partners = await Partner.findAll();
    res.json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

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

router.get("/offers", async (req, res) => {
  try {
    const offers = await Offer.findAll({ include: [Partner] });
    res.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

/* -------------------------------------------------------------------------- */
/* ✅ REPORTS API — Daily / Hourly with Filters                               */
/* -------------------------------------------------------------------------- */

router.get("/reports", async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      group = "daily",
      start_hour,
      end_hour,
      partner_id,
      affiliate_id,
      offer_id,
    } = req.query;

    // Example: this uses dummy data (replace with your DB query later)
    // You can connect this later to your `click_logs` or `conversion_logs` table
    const today = new Date();
    const data = [];

    // Helper to simulate random values
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const numDays = 7;
    for (let d = 0; d < numDays; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);

      if (group === "hourly") {
        for (let h = 0; h < 24; h++) {
          if (
            (start_hour && h < parseInt(start_hour)) ||
            (end_hour && h > parseInt(end_hour))
          )
            continue;

          const clicks = rand(100, 1000);
          const conversions = rand(1, 50);
          const revenue = conversions * rand(0.5, 1.5);
          const payout = revenue * 0.7;
          const profit = revenue - payout;

          data.push({
            date: date.toISOString().split("T")[0],
            hour: h,
            total_affiliates: 2,
            total_partners: 2,
            total_offers: 4,
            clicks,
            conversions,
            revenue: revenue.toFixed(2),
            payout: payout.toFixed(2),
            profit: profit.toFixed(2),
          });
        }
      } else {
        const clicks = rand(2000, 5000);
        const conversions = rand(50, 200);
        const revenue = conversions * rand(0.5, 1.5);
        const payout = revenue * 0.7;
        const profit = revenue - payout;

        data.push({
          date: date.toISOString().split("T")[0],
          total_affiliates: 2,
          total_partners: 2,
          total_offers: 4,
          clicks,
          conversions,
          revenue: revenue.toFixed(2),
          payout: payout.toFixed(2),
          profit: profit.toFixed(2),
        });
      }
    }

    // Filter simulation — later connect this to actual WHERE clauses
    const filtered = data.filter(() => true); // placeholder

    res.json(filtered);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

/* -------------------------------------------------------------------------- */
/* ✅ OFFER CREATION / DELETE / SEEDING                                       */
/* -------------------------------------------------------------------------- */

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
