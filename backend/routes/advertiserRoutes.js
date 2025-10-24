// backend/routes/advertiserRoutes.js
import express from "express";
import { Advertiser } from "../models/associations.js";

const router = express.Router();

// ✅ GET all advertisers
router.get("/", async (req, res) => {
  const advertisers = await Advertiser.findAll({ order: [["id", "DESC"]] });
  res.json(advertisers);
});

// ✅ POST create a new advertiser
router.post("/", async (req, res) => {
  const { name, contact_email, offer_url } = req.body;
  const advertiser = await Advertiser.create({ name, contact_email, offer_url });
  res.status(201).json(advertiser);
});

export default router;
