// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import { sequelize } from "./models/index.js";

dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  "https://dashboard.mob13r.com",
  "http://localhost:3000",
];
app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use("/api", routes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established.");
    console.log(`🚀 Mob13r Backend running on port ${PORT}`);
  } catch (error) {
    console.error("❌ Failed to connect DB:", error.message);
  }
});
