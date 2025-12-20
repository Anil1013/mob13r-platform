import express from "express";
import {
  getAdvertisers,
  createAdvertiser,
  updateAdvertiserStatus,
} from "../controllers/advertisers.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAdvertisers);
router.post("/", authMiddleware, createAdvertiser);
router.patch("/:id/status", authMiddleware, updateAdvertiserStatus);

export default router;
