import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./db.js";

// Routes
import adminRoutes from "./routes/admin.js";
import publishersRoutes from "./routes/publishers.js";
import advertisersRoutes from "./routes/advertisers.js";
import offersRoutes from "./routes/offers.js";
import clickRoutes from "./routes/clicks.js";
import postbackRoutes from "./routes/postbacks.js";
import conversionsRoutes from "./routes/conversions.js";
import statsRoutes from "./routes/stats.js";

import authKey from "./middleware/authKey.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

// ✅ CORS
app.use(
  cors({
    origin: ["https://dashboard.mob13r.com", "http://localhost:3000"],
    credentials: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", Authorization", "X-API-Key"]
  })
);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Health check (Public)
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() AS db_time");
    res.json({ status: "ok", db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ✅ Admin Routes (Public only for first key)
app.use("/api/admin/apikey", adminRoutes); // only allow apikey route without auth

// ✅ Protect all other admin routes for future login system
app.use("/api/admin", authKey, adminRoutes);

// ✅ Protected API Routes
app.use("/api/stats", authKey, statsRoutes);
app.use("/api/publishers", authKey, publishersRoutes);
app.use("/api/advertisers", authKey, advertisersRoutes);
app.use("/api/offers", authKey, offersRoutes);
app.use("/api/clicks", authKey, clickRoutes);
app.use("/api/postbacks", authKey, postbackRoutes);
app.use("/api/conversions", authKey, conversionsRoutes);

// ✅ Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
