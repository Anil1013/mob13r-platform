import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import pool from './db.js';

// Routes
import adminRoutes from './routes/admin.js';
import publishersRoutes from './routes/publishers.js';
import advertisersRoutes from './routes/advertisers.js';
import offersRoutes from './routes/offers.js';
import clickRoutes from './routes/clicks.js';
import postbackRoutes from './routes/postbacks.js';
import conversionsRoutes from './routes/conversions.js';
import statsRoutes from './routes/stats.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  "https://dashboard.mob13r.com",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS: Origin Not Allowed"));
      }
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(bodyParser.json({ limit: "10mb" }));

// ✅ Health check route
app.get("/api/health", async (req, res) => {
  try {
    const r = await pool.query("SELECT NOW() as db_time");
    res.json({ status: "ok", db_time: r.rows[0].db_time });
  } catch (err) {
    res.status(500).json({ error: "DB Error", details: err.message });
  }
});

// ✅ Combine all API routes under /api prefix
app.use("/api/admin", adminRoutes);
app.use("/api/publishers", publishersRoutes);
app.use("/api/advertisers", advertisersRoutes);
app.use("/api/offers", offersRoutes);
app.use("/api/clicks", clickRoutes);
app.use("/api/postbacks", postbackRoutes);
app.use("/api/conversions", conversionsRoutes);
app.use("/api/stats", statsRoutes);

// ✅ SQL Query Console
app.post("/api/query", async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql?.toLowerCase().startsWith("select"))
      return res.status(403).json({ error: "Only SELECT allowed" });

    const result = await pool.query(sql);
    return res.json({
      rows: result.rows,
      fields: result.fields.map(f => f.name)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
