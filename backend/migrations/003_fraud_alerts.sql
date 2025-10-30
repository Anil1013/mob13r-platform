CREATE TABLE IF NOT EXISTS fraud_alerts (
  id SERIAL PRIMARY KEY,
  publisher TEXT,
  issue TEXT,
  value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
