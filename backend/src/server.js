// backend/src/server.js
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./db.js";

/* ROUTES */
import publishersRoutes from "./routes/publishers.js";
import advertisersRoutes from "./routes/advertisers.js";
import offersRoutes from "./routes/offers.js";
import clickRoutes from "./routes/clicks.js";
import postbackRoutes from "./routes/postbacks.js";
import conversionsRoutes from "./routes/conversions.js";   // <-- FINAL
import statsRoutes from "./routes/stats.js";
import authRoutes from "./routes/auth.js";
import analyticsRoutes from "./routes/analytics.js";
import templateRoutes from "./routes/templates.js";
import publisherTrackingRoutes from "./routes/publisherTracking.js";
import fraudRoutes from "./routes/fraud.js";
import distributionRoutes from "./routes/distribution.js";
import analyticsClicks from "./routes/analyticsClicks.js";

import authJWT from "./middleware/authJWT.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

/* -------------------------------------------------------------------
   CORS CONFIG (Dashboard + Localhost)
------------------------------------------------------------------- */
app.use(
  cors({
    origin: [
      "https://dashboard.mob13r.com",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());

/* -------------------------------------------------------------------
   Security + Body Parsing
------------------------------------------------------------------- */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(bodyParser.json({ limit: "20mb" }));

/* -------------------------------------------------------------------
   HEALTH ROUTE
------------------------------------------------------------------- */
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS db_time");
    res.json({ status: "ok", db_time: result.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ status: "db_error" });
  }
});

/* -------------------------------------------------------------------
   PUBLIC CLICK ROUTE (publisher will hit this)
------------------------------------------------------------------- */
app.get("/click", (req, res) => {
  const params = new URLSearchParams(req.query).toString();
  return res.redirect(`/api/distribution/click?${params}`);
});

/* -------------------------------------------------------------------
   PUBLIC ROUTES (NO LOGIN REQUIRED)
------------------------------------------------------------------- */
app.use("/api/auth", authRoutes);           // Login / Signup
app.use("/api/distribution", distributionRoutes); // Click handling
app.use("/conversion", conversionsRoutes);  // <-- Advertiser Conversion Postback
// Example:
// https://backend.mob13r.com/conversion?click_id=123&payout=1.5&tx_id=ABC123

/* -------------------------------------------------------------------
   PROTECTED ROUTES (JWT REQUIRED)
------------------------------------------------------------------- */
app.use("/api/publishers", authJWT, publishersRoutes);
app.use("/api/advertisers", authJWT, advertisersRoutes);
app.use("/api/offers", authJWT, offersRoutes);
app.use("/api/clicks", authJWT, clickRoutes);
app.use("/api/postbacks", authJWT, postbackRoutes);
app.use("/api/conversions", authJWT, conversionsRoutes); // Dashboard listing
app.use("/api/stats", authJWT, statsRoutes);
app.use("/api/templates", authJWT, templateRoutes);
app.use("/api/tracking", authJWT, publisherTrackingRoutes);
app.use("/api/fraud", authJWT, fraudRoutes);

/* ANALYTICS */
app.use("/api/analytics", authJWT, analyticsRoutes);
app.use("/api/analytics/clicks", authJWT, analyticsClicks);

/* -------------------------------------------------------------------
   START SERVER
------------------------------------------------------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
