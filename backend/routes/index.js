import express from "express";
import authRoutes from "./auth.js";
import adminRoutes from "./admin.js";
import affiliateRoutes from "./affiliate.js";
import partnerRoutes from "./partner.js";
import trackRoutes from "./track.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/affiliate", affiliateRoutes);
router.use("/partner", partnerRoutes);
router.use("/track", trackRoutes);

export default router;
