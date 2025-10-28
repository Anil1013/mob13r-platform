-- 001_init.sql - Mob13r platform base schema

CREATE TABLE IF NOT EXISTS publishers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE,
    api_key VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    hold_percent INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS advertisers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(120) UNIQUE,
    api_token VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    advertiser_id INT REFERENCES advertisers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    tracking_url TEXT,
    payout NUMERIC(10,2),
    hold_percent INT DEFAULT 0,
    cap_daily INT DEFAULT NULL,
    cap_total INT DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS click_logs (
    id SERIAL PRIMARY KEY,
    publisher_id INT REFERENCES publishers(id) ON DELETE SET NULL,
    offer_id INT REFERENCES offers(id) ON DELETE SET NULL,
    click_id VARCHAR(255) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversions (
    id SERIAL PRIMARY KEY,
    click_id VARCHAR(255),
    publisher_id INT,
    offer_id INT,
    amount NUMERIC(10,2),
    status VARCHAR(50) DEFAULT 'pending', -- pending, validated, paid, rejected
    postback_received BOOLEAN DEFAULT false,
    validated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS postbacks (
    id SERIAL PRIMARY KEY,
    conversion_id INT REFERENCES conversions(id) ON DELETE CASCADE,
    provider TEXT,
    payload JSONB,
    status_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    payload JSONB,
    response JSONB,
    status_code INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(30) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- trigger to update updated_at
CREATE OR REPLACE FUNCTION mob13r_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_publishers_updated BEFORE UPDATE ON publishers FOR EACH ROW EXECUTE FUNCTION mob13r_update_timestamp();
CREATE TRIGGER trg_advertisers_updated BEFORE UPDATE ON advertisers FOR EACH ROW EXECUTE FUNCTION mob13r_update_timestamp();
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION mob13r_update_timestamp();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION mob13r_update_timestamp();
