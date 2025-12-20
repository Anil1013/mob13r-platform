import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const login = async (req, res) => {
  const { email, password } = req.body;

  // TEMP ADMIN LOGIN (later DB se aayega)
  if (email !== "admin@mob13r.com") {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(
    password,
    "$2b$10$svgCr6DiTJu/a8wZC2ZWLhuC6sA6IK6Hu8ALykd8KfjcECYEq7Fa" // Admin@123 hash
  );

  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { email, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    user: { email, role: "admin" },
  });
};

