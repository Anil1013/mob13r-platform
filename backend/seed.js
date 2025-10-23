import dotenv from "dotenv";
import pkg from "pg";

const { Pool } = pkg;
dotenv.config();

// ✅ Create database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

const seed = async () => {
  try {
    console.log("🌱 Starting database seed...");

    // ✅ Create tables if they don’t exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS advertisers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        api_base TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS publishers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        api_key VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ✅ Insert default advertisers
    await pool.query(`
      INSERT INTO advertisers (name, api_base, status)
      VALUES 
      ('SEL Telecom', 'https://api.seltelecom.in', 'active'),
      ('PayZone', 'https://api.payzone.com', 'active')
      ON CONFLICT DO NOTHING;
    `);

    // ✅ Insert default publishers
    await pool.query(`
      INSERT INTO publishers (name, email, api_key, status)
      VALUES 
      ('Anil Publisher', 'anil@example.com', 'PUB-123456', 'active'),
      ('Test Publisher', 'test@example.com', 'PUB-654321', 'active')
      ON CONFLICT DO NOTHING;
    `);

    console.log("✅ Seed data inserted successfully!");
    await pool.end();
  } catch (err) {
    console.error("❌ Seed failed:");
    console.error(err);
    process.exit(1);
  }
};

seed();
