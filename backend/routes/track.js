import express from "express";
const router = express.Router();

// Track clicks (placeholder)
router.post("/click", (req, res) => {
  res.json({ message: "Track click route working" });
});

// Track conversions (placeholder)
router.post("/conversion", (req, res) => {
  res.json({ message: "Track conversion route working" });
});

export default router;
