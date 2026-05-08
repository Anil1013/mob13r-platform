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
  try {
    const { email, password } = req.body;

    // ✅ Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    if (email !== USER.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const isMatch = await bcrypt.compare(password, USER.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: USER.id, email: USER.email, role: USER.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      success: true,
      token,
      expiresIn: 60 * 60 * 24,
      user: {
        email: USER.email,
        role: USER.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

export default router;
