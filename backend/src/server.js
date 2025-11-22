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
import templateRoutes from "./routes/templates.js";
import publisherTrackingRoutes from "./routes/publisherTracking.js";
import fraudRoutes from "./routes/fraud.js";
import distributionRoutes from "./routes/distribution.js";

/* Middleware */
import authJWT from "./middleware/authJWT.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

/* ---------------------------------------------------------
   GLOBAL CORS
--------------------------------------------------------- */
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

app.options("*", cors());

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    req.headers.origin || "https://dashboard.mob13r.com"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

/* ---------------------------------------------------------
   Security & JSON
--------------------------------------------------------- */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(bodyParser.json({ limit: "10mb" }));

/* ---------------------------------------------------------
   Health Check
--------------------------------------------------------- */
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS db_time");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ status: "ok", db_time: result.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

/* ---------------------------------------------------------
   PUBLIC CLICK → Redirect to distribution click
--------------------------------------------------------- */
app.get("/click", (req, res) => {
  try {
    const params = new URLSearchParams(req.query).toString();
    return res.redirect(`/api/distribution/click?${params}`);
  } catch {
    return res.redirect("https://google.com");
  }
});

/* ---------------------------------------------------------
   API ROUTES
--------------------------------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/publishers", authJWT, publishersRoutes);
app.use("/api/advertisers", authJWT, advertisersRoutes);
app.use("/api/offers", authJWT, offersRoutes);
app.use("/api/clicks", authJWT, clickRoutes);
app.use("/api/postbacks", authJWT, postbackRoutes);
app.use("/api/conversions", authJWT, conversionsRoutes);
app.use("/api/stats", authJWT, statsRoutes);
app.use("/api/templates", authJWT, templateRoutes);
app.use("/api/tracking", authJWT, publisherTrackingRoutes);

app.use("/api/fraud", authJWT, fraudRoutes);

/* ---------------------------------------------------------
   PUBLIC DISTRIBUTION API
--------------------------------------------------------- */
app.use("/api/distribution", distributionRoutes);

/* ---------------------------------------------------------
   START SERVER
--------------------------------------------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
