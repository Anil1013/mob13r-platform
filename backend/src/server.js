// 📂 /backend/src/server.js
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./db.js";

/* Routes */
import publishersRoutes from "./routes/publishers.js";
import advertisersRoutes from "./routes/advertisers.js";
import offersRoutes from "./routes/offers.js";
import clickRoutes from "./routes/clicks.js";
import postbackRoutes from "./routes/postbacks.js";
import conversionsRoutes from "./routes/conversions.js";
import statsRoutes from "./routes/stats.js";
import authRoutes from "./routes/auth.js";
import analyticsRoutes from "./routes/analytics.js";

/* Middleware */
import authJWT from "./middleware/authJWT.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

/* 🧱 Security */
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

/* 🌐 CORS */
app.use(
  cors({
    origin: [
      "https://dashboard.mob13r.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/* 🧾 Request Body */
app.use(bodyParser.json({ limit: "10mb" }));

/* ✅ Health Check (used by NGINX / monitoring) */
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS db_time");
    res.status(200).json({ status: "ok", db_time: result.rows[0].db_time });
  } catch (err) {
    console.error("❌ Database health check failed:", err.message);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/* =========================
   🔓 PUBLIC ROUTES
   ========================= */
app.use("/api/auth", authRoutes);
app.use("/api/click", clickRoutes);        // Public click tracking endpoint
app.use("/api/postback", postbackRoutes);  // Public advertiser conversion postbacks

/* =========================
   🔐 PROTECTED ROUTES
   ========================= */
app.use("/api/publishers", authJWT, publishersRoutes);
app.use("/api/advertisers", authJWT, advertisersRoutes);
app.use("/api/offers", authJWT, offersRoutes);
app.use("/api/conversions", authJWT, conversionsRoutes);
app.use("/api/stats", authJWT, statsRoutes);
app.use("/api/analytics", authJWT, analyticsRoutes);

/* ✅ Default root */
app.get("/", (req, res) => {
  res.send("✅ Mob13r Backend API running successfully!");
});

/* 🚀 Start Server */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Mob13r backend running on port ${PORT}`);
});
