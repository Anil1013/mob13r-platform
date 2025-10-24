// backend/routes/advertiserRoutes.js
import express from "express";
import { Advertiser } from "../models/index.js";

const router = express.Router();

/**
 * ✅ Get all advertisers
 */
router.get("/", async (req, res) => {
  try {
    const advertisers = await Advertiser.findAll();
    res.json(advertisers);
  } catch (error) {
    console.error("❌ Error fetching advertisers:", error.message);
    res.status(500).json({ error: "Failed to fetch advertisers" });
  }
});

/**
 * ✅ Create a new advertiser
 */
router.post("/", async (req, res) => {
  try {
    const advertiser = await Advertiser.create(req.body);
    res.status(201).json(advertiser);
  } catch (error) {
    console.error("❌ Error creating advertiser:", error.message);
    res.status(400).json({ error: "Failed to create advertiser" });
  }
});

/**
 * ✅ Get a single advertiser by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const advertiser = await Advertiser.findByPk(req.params.id);
    if (!advertiser) {
      return res.status(404).json({ error: "Advertiser not found" });
    }
    res.json(advertiser);
  } catch (error) {
    console.error("❌ Error fetching advertiser:", error.message);
    res.status(500).json({ error: "Failed to fetch advertiser" });
  }
});

/**
 * ✅ Update advertiser
 */
router.put("/:id", async (req, res) => {
  try {
    const advertiser = await Advertiser.findByPk(req.params.id);
    if (!advertiser) return res.status(404).json({ error: "Advertiser not found" });

    await advertiser.update(req.body);
    res.json(advertiser);
  } catch (error) {
    console.error("❌ Error updating advertiser:", error.message);
    res.status(400).json({ error: "Failed to update advertiser" });
  }
});

/**
 * ✅ Delete advertiser
 */
router.delete("/:id", async (req, res) => {
  try {
    const advertiser = await Advertiser.findByPk(req.params.id);
    if (!advertiser) return res.status(404).json({ error: "Advertiser not found" });

    await advertiser.destroy();
    res.json({ message: "Advertiser deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting advertiser:", error.message);
    res.status(500).json({ error: "Failed to delete advertiser" });
  }
});

export default router;
