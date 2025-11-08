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

/* ----------------- CORS ----------------- */
/* allow dashboard + localhost; include credentials if needed */
const allowedOrigins = [
  "https://dashboard.mob13r.com",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"), false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Preflight handler (extra safety)
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", allowedOrigins.join(","));
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res.sendStatus(200);
});

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(bodyParser.json({ limit: "10mb" }));

/* ----------------- Health ----------------- */
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS db_time");
    res.json({ status: "ok", db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

/* ----------------- Public (auth) ----------------- */
app.use("/api/auth", authRoutes);

/* ----------------- Protected routes (JWT) ----------------- */
app.use("/api/publishers", authJWT, publishersRoutes);
app.use("/api/advertisers", authJWT, advertisersRoutes);
app.use("/api/offers", authJWT, offersRoutes);
app.use("/api/clicks", authJWT, clickRoutes);
app.use("/api/postbacks", authJWT, postbackRoutes);
app.use("/api/conversions", authJWT, conversionsRoutes);
app.use("/api", authJWT, analyticsRoutes);
app.use("/api/stats", authJWT, statsRoutes);

/* ----------------- Error handler ----------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res.status(500).json({ error: "Internal server error", message: err?.message });
});

/* ----------------- Optional: serve frontend build (if deployed together) ----------------- */
// If you want to serve the React build from backend, uncomment below and ensure
// frontend build is located at ../frontend/build
//
// import path from "path";
// app.use(express.static(path.join(process.cwd(), "../frontend/build")));
// app.get("/", (req, res) => {
//   res.sendFile(path.join(process.cwd(), "../frontend/build", "index.html"));
// });

/* ----------------- Start ----------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
