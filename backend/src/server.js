import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import pool from "./db.js";
import appRoutes from "./app.js";

dotenv.config();

const app = express();

/* ✅ TRUST PROXY */
app.set("trust proxy", 1);

/* ✅ CORS */
const corsOptions = {
  origin: [
    "https://dashboard.mob13r.com",
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "x-publisher-key",
  ],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ✅ ROUTES (app.js handle karegi sab) */
app.use(appRoutes);

/* ✅ GLOBAL ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(err.status || 500).json({
    status: "FAILED",
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 8080;

// ✅ IST midnight cron — reset today_hits daily at 00:00 IST (18:30 UTC)
cron.schedule("30 18 * * *", async () => {
  try {
    const result = await pool.query(
      `UPDATE offers SET today_hits = 0, last_reset_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
       WHERE last_reset_date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date`
    );
    console.log(\`✅ Daily reset: \${result.rowCount} offers reset at IST midnight\`);
  } catch (err) {
    console.error("❌ Cron reset failed:", err.message);
  }
}, { timezone: "UTC" });

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
