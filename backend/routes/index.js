import express from "express";
import publisherRoutes from "./publisherRoutes.js";
import advertiserRoutes from "./advertiserRoutes.js";

const router = express.Router();

router.use("/publishers", publisherRoutes);
router.use("/advertisers", advertiserRoutes);

router.get("/", (req, res) => {
  res.json({ message: "Backend API running ✅" });
});

export default router;
