// backend/routes/index.js
import express from "express";
import publisherRoutes from "./publisherRoutes.js";
import advertiserRoutes from "./advertiserRoutes.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "🚀 Mob13r Backend with Sequelize is live!" });
});

router.use("/publishers", publisherRoutes);
router.use("/advertisers", advertiserRoutes);

export default router;
