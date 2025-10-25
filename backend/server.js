// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { sequelize, Publisher, Advertiser } from "./models/index.js";

dotenv.config();

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://dashboard.mob13r.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Attach models to req for easy use in routes
app.use((req, res, next) => {
  req.db = { Publisher, Advertiser };
  next();
});

// ✅ Routes
app.use("/api", routes);

// ✅ Default root route
app.get("/", (req, res) => {
  res.json({ message: "Mob13r Backend API running ✅" });
});

// ✅ Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established.");
    console.log(`🚀 Mob13r Backend running on port ${PORT}`);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
});
