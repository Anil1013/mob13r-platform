import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import { sequelize, initModels } from "./models.js";
import adminRoutes from "./routes/admin.js"; // ✅ direct import
import seed from "./seed.js";

dotenv.config();
const app = express();

// ✅ Health check for AWS Elastic Beanstalk
app.get("/", (req, res) => {
  res.send("✅ Mob13r Backend is Live and Connected to AWS RDS!");
});

// ✅ AWS Health Check Route (important for EB Green health)
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "healthy", message: "Backend is up and running 🚀" });
});

// ✅ Enable CORS for Amplify + Local Dev + API Tools
const allowedOrigins = [
  "https://dashboard.mob13r.com", // Amplify frontend
  "http://localhost:3000",        // local dev
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`⚠️  CORS blocked for origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(bodyParser.json());

// ✅ Mount Admin APIs (partners, offers, affiliates, reports)
app.use("/api/admin", adminRoutes);

// ✅ Catch-all fallback for invalid routes
app.all("*", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

const PORT = process.env.PORT || 8080;

// ✅ Start server with DB initialization
(async () => {
  try {
    initModels();
    await sequelize.authenticate();
    console.log("✅ Database connected successfully.");

    await sequelize.sync({ alter: true });
    console.log("✅ Database synced successfully.");

    await seed();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup Error:", error.message);
    process.exit(1);
  }
})();
