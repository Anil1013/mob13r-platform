// backend/db/initTables.js
import pool from "./db.js";

export async function initDatabase() {
  const createTablesQuery = `
    -- ✅ Advertisers
    CREATE TABLE IF NOT EXISTS advertisers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      api_base TEXT,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- ✅ Publishers
    CREATE TABLE IF NOT EXISTS publishers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      api_key VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- ✅ Offers
    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      advertiser_id INTEGER REFERENCES advertisers(id) ON DELETE CASCADE,
      title VARCHAR(255),
      payout DECIMAL(10, 2),
      url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- ✅ Click Logs
    CREATE TABLE IF NOT EXISTS click_logs (
      id SERIAL PRIMARY KEY,
      offer_id INTEGER REFERENCES offers(id) ON DELETE CASCADE,
      publisher_id INTEGER REFERENCES publishers(id) ON DELETE CASCADE,
      advertiser_id INTEGER REFERENCES advertisers(id) ON DELETE CASCADE,
      click_id VARCHAR(255) UNIQUE,
      ip_address VARCHAR(100),
      user_agent TEXT,
      status VARCHAR(50) DEFAULT 'clicked',
      revenue DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await pool.query(createTablesQuery);
    console.log("✅ All database tables are ready");
  } catch (err) {
    console.error("❌ Failed to initialize database tables:", err);
  }
}
