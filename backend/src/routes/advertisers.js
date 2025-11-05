import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "../db.js";

/* Routes */
import authRoutes from "./routes/auth.js";
import publishersRoutes from "./routes/publishers.js";
import advertisersRoutes from "./routes/advertisers.js";
import offersRoutes from "./routes/offers.js";
import clickRoutes from "./routes/clicks.js";
import postbackRoutes from "./routes/postbacks.js";
import conversionsRoutes from "./routes/conversions.js";
import statsRoutes from "./routes/stats.js";

/* Middleware */
import authJWT from "./middleware/authJWT.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

/* ✅ Security headers */
app.use(helmet({ crossOriginResourcePolicy: false }));

/* ✅ CORS setup */
app.use(
  cors({
    origin: [
      "https://dashboard.mob13r.com",
      "https://www.dashboard.mob13r.com",
      "http://localhost:3000"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ✅ CORS Preflight Handler */
app.options("*", cors());

/* ✅ Manual CORS headers */
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://dashboard.mob13r.com");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

/* ✅ body parser */
app.use(bodyParser.json({ limit: "10mb" }));

/* ✅ Health check */
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS db_time");
    res.json({ status: "ok", db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

/* ✅ Public routes */
app.use("/api/auth", authRoutes);

/* ✅ Auth protected routes */
app.use("/api/stats", authJWT, statsRoutes);
app.use("/api/publishers", authJWT, publishersRoutes);
app.use("/api/advertisers", authJWT, advertisersRoutes);
app.use("/api/offers", authJWT, offersRoutes);
app.use("/api/clicks", authJWT, clickRoutes);
app.use("/api/postbacks", authJWT, postbackRoutes);
app.use("/api/conversions", authJWT, conversionsRoutes);

/* ✅ Server Listener */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
