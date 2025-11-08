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
import templateRoutes from "./routes/templates.js";  // ✅ NEW IMPORT

/* Middleware */
import authJWT from "./middleware/authJWT.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

/* ======================================================
   ✅ FIXED CORS CONFIGURATION (for both frontend & EB)
   ====================================================== */
app.use(
  cors({
    origin: [
      "https://dashboard.mob13r.com", // frontend domain
      "http://localhost:3000",         // local testing
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Handle preflight OPTIONS manually
app.options("*", (req, res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    req.headers.origin || "https://dashboard.mob13r.com"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

/* ======================================================
   ✅ SECURITY + JSON HANDLING
   ====================================================== */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(bodyParser.json({ limit: "10mb" }));

/* ======================================================
   ✅ HEALTH CHECK ENDPOINT
   ====================================================== */
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS db_time");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ status: "ok", db_time: result.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

/* ======================================================
   ✅ ROUTES
   ====================================================== */

// Public route
app.use("/api/auth", authRoutes);

// Protected routes (JWT required)
app.use("/api/publishers", authJWT, publishersRoutes);
app.use("/api/advertisers", authJWT, advertisersRoutes);
app.use("/api/offers", authJWT, offersRoutes);
app.use("/api/clicks", authJWT, clickRoutes);
app.use("/api/postbacks", authJWT, postbackRoutes);
app.use("/api/conversions", authJWT, conversionsRoutes);
app.use("/api/stats", authJWT, statsRoutes);
app.use("/api/templates", authJWT, templateRoutes); // ✅ NEW ROUTE
app.use("/api", authJWT, analyticsRoutes);

/* ======================================================
   ✅ START SERVER
   ====================================================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
