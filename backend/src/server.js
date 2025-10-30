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

// ✅ CORS for dashboard
const allowedOrigins = [
  "https://dashboard.mob13r.com",
  "http://localhost:3000"
];

app.use(cors({
  origin: allowedOrigins,
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,X-API-Key"
}));

app.options("*", cors()); // ✅ Preflight support

app.use(helmet());
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Health check (public)
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT now() as db_time");
    res.json({ status: "ok", db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ error: "DB connection error", details: err.message });
  }
});

// ✅ Public: first admin key creation & login
app.use("/api/admin", adminRoutes);

// ✅ Protected API Routes
app.use("/api/stats", authKey, statsRoutes);
app.use("/api/publishers", authKey, publishersRoutes);
app.use("/api/advertisers", authKey, advertisersRoutes);
app.use("/api/offers", authKey, offersRoutes);
app.use("/api/clicks", authKey, clickRoutes);
app.use("/api/postbacks", authKey, postbackRoutes);
app.use("/api/conversions", authKey, conversionsRoutes);

// ✅ Listen on 0.0.0.0 for AWS
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running at http://0.0.0.0:${PORT}`);
});
