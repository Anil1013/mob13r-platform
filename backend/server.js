import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import pkg from "pg";

const { Pool } = pkg;
dotenv.config();

const app = express();

// Allow requests from Amplify + local
const allowedOrigins = [
  "https://dashboard.mob13r.com",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// PostgreSQL pool setup
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection failed:", err.message));

// Routes
app.use("/api", routes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "✅ Backend running", service: "Mob13r API" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

export { pool };
