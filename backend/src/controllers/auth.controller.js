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
    "$2b$10$Q9qQ1gE0H2zJYxkU2v8Z1eZ9E2GZ0uD6K8E4wJt0X0Rz7Z5N8b9Wq" // Admin@123 hash
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
