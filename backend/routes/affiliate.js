import express from "express";
const router = express.Router();

// Get affiliate dashboard info (placeholder)
router.get("/dashboard", (req, res) => {
  res.json({ message: "Affiliate dashboard route working" });
});

// Get affiliate offers (placeholder)
router.get("/offers", (req, res) => {
  res.json({ message: "Affiliate offers route working" });
});

export default router;
