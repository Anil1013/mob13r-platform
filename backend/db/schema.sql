-- ✅ Advertisers table
CREATE TABLE IF NOT EXISTS advertisers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  api_base TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Publishers table
CREATE TABLE IF NOT EXISTS publishers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  api_key VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Offers table
CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  advertiser_id INTEGER REFERENCES advertisers(id) ON DELETE CASCADE,
  title VARCHAR(255),
  payout DECIMAL(10, 2),
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
