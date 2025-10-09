import express from "express";
const router = express.Router();

// Login route (placeholder)
router.post("/login", (req, res) => {
  res.json({ message: "Auth login route working" });
});

// Register route (placeholder)
router.post("/register", (req, res) => {
  res.json({ message: "Auth register route working" });
});

export default router;
