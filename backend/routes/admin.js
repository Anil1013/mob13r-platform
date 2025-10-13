import express from "express";
import { sequelize, initModels } from "../models.js";

const router = express.Router();

// Before sending affiliates, remove password fields
const affiliates = await Affiliate.findAll({
  attributes: { exclude: ['password'] },
});

// ✅ Initialize models
const { Partner, Offer, Affiliate } = initModels();

// ✅ Fetch all partners
router.get("/partners", async (req, res) => {
  try {
    const partners = await Partner.findAll();
    res.json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).json({ error: "Failed to fetch partners" });
  }
});

// ✅ Fetch all affiliates
router.get("/affiliates", async (req, res) => {
  try {
    const affiliates = await Affiliate.findAll();
    res.json(affiliates);
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    res.status(500).json({ error: "Failed to fetch affiliates" });
  }
});

// ✅ Fetch all offers (with partner info)
router.get("/offers", async (req, res) => {
  try {
    const offers = await Offer.findAll({ include: [Partner] });
    res.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

// ✅ Create a new offer
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

    if (!name || !partner_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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

// ✅ Delete an offer by ID
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

import seed from "../seed.js";

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
