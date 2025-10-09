import express from "express";
const router = express.Router();

// Get partner info (placeholder)
router.get("/info", (req, res) => {
  res.json({ message: "Partner info route working" });
});

// Get partner offers (placeholder)
router.get("/offers", (req, res) => {
  res.json({ message: "Partner offers route working" });
});

export default router;
