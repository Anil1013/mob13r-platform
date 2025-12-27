import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router = express.Router();

/**
 * TEMP STATIC USER
 * later DB se aayega
 */
const USER = {
  id: 1,
  email: "admin@mob13r.com",
  password: bcrypt.hashSync("Admin@123", 10),
  role: "admin"
};

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (email !== USER.email) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, USER.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: USER.id, email: USER.email, role: USER.role },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    user: {
      email: USER.email,
      role: USER.role
    }
  });
});

export default router;
