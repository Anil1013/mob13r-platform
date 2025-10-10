import express from "express";
import { sequelize } from "../models.js";

const router = express.Router();
const { Partner, Offer, Affiliate } = sequelize.models;

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

// ✅ Fetch all offers
router.get("/offers", async (req, res) => {
  try {
    const offers = await Offer.findAll({ include: [Partner] });
    res.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
});

export default router;
