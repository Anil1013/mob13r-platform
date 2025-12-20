import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (email !== "admin@mob13r.com") {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ADMIN_HASH =
    "$2b$10$vgCr6DiTJu/a8wZC2ZWLhuC6sA6IK6Hu8ALykdk8KfjcECYQa7Fa";

  const valid = await bcrypt.compare(password, ADMIN_HASH);

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
