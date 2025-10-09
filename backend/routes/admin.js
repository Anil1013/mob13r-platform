import express from "express";
const router = express.Router();

// Get all affiliates (placeholder)
router.get("/affiliates", (req, res) => {
  res.json({ message: "Admin affiliates route working" });
});

// Get all partners (placeholder)
router.get("/partners", (req, res) => {
  res.json({ message: "Admin partners route working" });
});

export default router;
