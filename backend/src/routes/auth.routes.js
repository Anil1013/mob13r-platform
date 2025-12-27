import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // TEMP demo login (replace with DB later)
  if (email === "admin@mob13r.com" && password === "Admin@123") {
    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET || "mob13r_secret",
      { expiresIn: "24h" }
    );

    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

export default router;
