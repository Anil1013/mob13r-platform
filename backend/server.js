// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { sequelize } from "./models/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Mob13r Backend is running ✅" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mob13r Backend running on port ${PORT}`);
});
