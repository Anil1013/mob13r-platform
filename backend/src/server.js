// backend/src/server.js
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import bodyParser from "body-parser";
import pool from "./db.js";

import authKey from "./middleware/authKey.js";

import adminRoutes from "./routes/admin.js";
import publishersRoutes from "./routes/publishers.js";
import advertisersRoutes from "./routes/advertisers.js";
import offersRoutes from "./routes/offers.js";
import clickRoutes from "./routes/clicks.js";
import postbackRoutes from "./routes/postbacks.js";
import conversionsRoutes from "./routes/conversions.js";
import statsRoutes from "./routes/stats.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// ✅ CORS first
const allowedOrigins = [
  "https://dashboard.mob13r.com",
  "http://localhost:3000",
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));

app.options("*", cors()); // preflight
app.use(helmet());
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Public health
app.get("/api/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT now() as db_time");
    res.json({ status: "ok", db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ error: "DB connection error", details: err.message });
  }
});

// ✅ Admin routes (authKey bootstrap mode me 0 keys par open, warna protected)
app.use("/api/admin", authKey, adminRoutes);

// ✅ Protected block — ek jagah auth, phir routes
app.use("/api", authKey);
app.use("/api/stats", statsRoutes);
app.use("/api/publishers", publishersRoutes);
app.use("/api/advertisers", advertisersRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/clicks", clickRoutes);
app.use("/api/postbacks", postbackRoutes);
app.use("/api/conversions", conversionsRoutes);

// ✅ Start
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running at http://0.0.0.0:${PORT}`);
});
