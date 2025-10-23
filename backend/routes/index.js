import express from "express";
const router = express.Router();

// Default API root route
router.get("/", (req, res) => {
  res.json({
    status: "API working 🚀",
    message: "Welcome to Mob13r backend",
  });
});

// Example: add DB check or health route later
export default router;

