import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./db.js";

import publishersRoutes from "./routes/publishers.js";
import advertisersRoutes from "./routes/advertisers.js";
import offersRoutes from "./routes/offers.js";
import clickRoutes from "./routes/clicks.js";
import postbackRoutes from "./routes/postbacks.js";
import conversionsRoutes from "./routes/conversions.js";
import statsRoutes from "./routes/stats.js";
import authRoutes from "./routes/auth.js";
import authJWT from "./middleware/authJWT.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// ✅ Global middleware
app.use(express.json());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(helmet({ crossOriginResourcePolicy: false }));

// ✅ CORS FIX for production dashboard
const allowedOrigins = [
  "https://dashboard.mob13r.com",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// ✅ Preflight handler
app.options("*", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(200);
});

// ✅ Public Health Route
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS db_time");
    res.json({ status: "ok", db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ✅ Public Auth Route
app.use("/api/auth", authRoutes);

// ✅ Protected Routes
app.use("/api/stats", authJWT, statsRoutes);
app.use("/api/publishers", authJWT, publishersRoutes);
app.use("/api/advertisers", authJWT, advertisersRoutes);
app.use("/api/offers", authJWT, offersRoutes);
app.use("/api/clicks", authJWT, clickRoutes);
app.use("/api/postbacks", authJWT, postbackRoutes);
app.use("/api/conversions", authJWT, conversionsRoutes);

// ✅ Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend live on port ${PORT}`);
});
