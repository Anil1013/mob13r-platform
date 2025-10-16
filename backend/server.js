import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize, initModels } from "./models.js";
import adminRoutes from "./routes/admin.js";
import seed from "./seed.js";

dotenv.config();
const app = express();

// ✅ Base health route (used by AWS for automatic health checks)
app.get("/", (req, res) => {
  res.send("✅ Mob13r Backend is Live and Connected to AWS RDS!");
});

// ✅ Amplify & Localhost CORS setup
app.use(cors({
  origin: [
    "https://dashboard.mob13r.com",
    "http://localhost:3000"
  ],
  credentials: true,
}));

app.use(bodyParser.json());

// ✅ Dedicated AWS Elastic Beanstalk health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    message: "Backend is up and running 🚀"
  });
});

// ✅ Mount Admin APIs
app.use("/api/admin", adminRoutes);

// ✅ Catch-all fallback
app.use("*", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

const PORT = process.env.PORT || 8080;

// ✅ Start server and sync DB
(async () => {
  try {
    initModels();
    await sequelize.authenticate();
    console.log("✅ Database connection established.");

    await sequelize.sync({ alter: true });
    console.log("✅ DB synced successfully");

    await seed();

    app.listen(PORT, () =>
      console.log(`🚀 Backend running on port ${PORT}`)
    );
  } catch (error) {
    console.error("❌ Startup Error:", error);
    process.exit(1);
  }
})();
