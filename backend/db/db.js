// backend/db/db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "mob13r-db.cpswoqw4opaa.ap-south-1.rds.amazonaws.com",
  user: process.env.DB_USER || "mob13r_admin",
  password: process.env.DB_PASS || "your-db-password",
  database: process.env.DB_NAME || "mob13r-db",
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL Database (mob13r-db)"))
  .catch((err) => console.error("❌ Database Connection Error:", err));

export default pool;
