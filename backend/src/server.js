import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./db.js";

import adminRoutes from "./routes/admin.js";
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

// ✅ CORS
app.use(
  cors({
    origin: ["https://dashboard.mob13r.com", "http://localhost:3000"],
    credentials: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Public Route (Health)
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

// ✅ Protected Routes via JWT
app.use("/api/stats", authJWT, statsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/publishers", authJWT, publishersRoutes);
app.use("/api/advertisers", authJWT, advertisersRoutes);
app.use("/api/offers", authJWT, offersRoutes);
app.use("/api/clicks", authJWT, clickRoutes);
app.use("/api/postbacks", authJWT, postbackRoutes);
app.use("/api/conversions", authJWT, conversionsRoutes);

// ✅ Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
