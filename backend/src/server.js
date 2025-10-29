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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Health check (backend + DB)
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT now() as db_time");
    res.json({ status: "ok", db_time: r.rows[0].db_time });
  } catch (err) {
    console.error("❌ Health check failed:", err.message);
    res.status(500).json({ error: "DB connection error", details: err.message });
  }
});

// ✅ Phase 1 — Real-time Dashboard Stats
app.get("/api/stats", async (req, res) => {
  try {
    const q = `
      SELECT
        (SELECT COUNT(*) FROM publishers) AS publishers,
        (SELECT COUNT(*) FROM advertisers) AS advertisers,
        (SELECT COUNT(*) FROM offers) AS offers,
        (SELECT COUNT(*) FROM conversions) AS conversions
    `;
    const { rows } = await pool.query(q);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching stats:", err.message);
    res.status(500).json({ error: "Failed to fetch stats", details: err.message });
  }
});

// ✅ Mount feature routes
app.use("/api/admin", adminRoutes);
app.use("/api/publishers", publishersRoutes);
app.use("/api/advertisers", advertisersRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/clicks", clickRoutes);
app.use("/api/postbacks", postbackRoutes);
app.use("/api/conversions", conversionsRoutes);

// ✅ Phase 2 — Safe Query Console (read-only)
app.post("/api/query", async (req, res) => {
  try {
    const { sql } = req.body;

    if (!sql || typeof sql !== "string")
      return res.status(400).json({ error: "Invalid SQL query" });

    const trimmed = sql.trim().toLowerCase();

    // block any non-select or potentially destructive statements
    const forbidden =
      /(drop|truncate|delete|alter|update|insert|create|replace|grant|revoke|commit|rollback)/i;

    if (forbidden.test(trimmed))
      return res.status(403).json({ error: "Only safe SELECT queries allowed" });

    if (!trimmed.startsWith("select"))
      return res.status(403).json({ error: "Query must start with SELECT" });

    if (sql.length > 15000)
      return res.status(400).json({ error: "Query too large" });

    const result = await pool.query(sql);
    res.json({
      rowCount: result.rowCount,
      fields: result.fields?.map((f) => f.name) || [],
      rows: result.rows,
    });
  } catch (err) {
    console.error("❌ Query execution error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Fallback route
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mob13r Backend running on port ${PORT}`);
});
