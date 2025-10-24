// backend/routes/publisherRoutes.js
import express from "express";
import { Publisher } from "../models/associations.js";

const router = express.Router();

// ✅ GET all publishers
router.get("/", async (req, res) => {
  const publishers = await Publisher.findAll({ order: [["id", "DESC"]] });
  res.json(publishers);
});

// ✅ POST create a new publisher
router.post("/", async (req, res) => {
  const { name, email, website } = req.body;
  const publisher = await Publisher.create({ name, email, website });
  res.status(201).json(publisher);
});

export default router;
