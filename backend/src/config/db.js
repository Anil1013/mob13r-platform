import pkg from "pg";
import dotenv from "dotenv";

// ✅ Only load .env locally (NOT in production)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
  console.log("📦 DB:", process.env.DB_NAME);
});

pool.on("error", (err) => {
  console.error("❌ DB connection error", err);
  process.exit(1);
});

export default pool;
