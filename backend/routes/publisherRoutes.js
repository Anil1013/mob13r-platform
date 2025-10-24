// backend/routes/publisherRoutes.js
import express from "express";
import { Publisher } from "../models/index.js";

const router = express.Router();

/**
 * ✅ Get all publishers
 */
router.get("/", async (req, res) => {
  try {
    const publishers = await Publisher.findAll();
    res.json(publishers);
  } catch (error) {
    console.error("❌ Error fetching publishers:", error.message);
    res.status(500).json({ error: "Failed to fetch publishers" });
  }
});

/**
 * ✅ Create a new publisher
 */
router.post("/", async (req, res) => {
  try {
    const publisher = await Publisher.create(req.body);
    res.status(201).json(publisher);
  } catch (error) {
    console.error("❌ Error creating publisher:", error.message);
    res.status(400).json({ error: "Failed to create publisher" });
  }
});

/**
 * ✅ Get a single publisher by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const publisher = await Publisher.findByPk(req.params.id);
    if (!publisher) {
      return res.status(404).json({ error: "Publisher not found" });
    }
    res.json(publisher);
  } catch (error) {
    console.error("❌ Error fetching publisher:", error.message);
    res.status(500).json({ error: "Failed to fetch publisher" });
  }
});

/**
 * ✅ Update a publisher
 */
router.put("/:id", async (req, res) => {
  try {
    const publisher = await Publisher.findByPk(req.params.id);
    if (!publisher) return res.status(404).json({ error: "Publisher not found" });

    await publisher.update(req.body);
    res.json(publisher);
  } catch (error) {
    console.error("❌ Error updating publisher:", error.message);
    res.status(400).json({ error: "Failed to update publisher" });
  }
});

/**
 * ✅ Delete a publisher
 */
router.delete("/:id", async (req, res) => {
  try {
    const publisher = await Publisher.findByPk(req.params.id);
    if (!publisher) return res.status(404).json({ error: "Publisher not found" });

    await publisher.destroy();
    res.json({ message: "Publisher deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting publisher:", error.message);
    res.status(500).json({ error: "Failed to delete publisher" });
  }
});

export default router;
