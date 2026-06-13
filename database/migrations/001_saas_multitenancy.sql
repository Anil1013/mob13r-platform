-- =============================================
-- SAAS MULTI-TENANCY MIGRATION
-- =============================================

-- 1. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'starter',
  status VARCHAR(20) DEFAULT 'active',
  stripe_customer_id VARCHAR(255),
  max_publishers INT DEFAULT 5,
  max_offers INT DEFAULT 10,
  monthly_conversions INT DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  org_id INT REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'owner',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL,
  max_publishers INT DEFAULT 5,
  max_offers INT DEFAULT 10,
  monthly_conversions INT DEFAULT 1000,
  features JSONB DEFAULT '[]'
);

-- INSERT DEFAULT PLANS
INSERT INTO plans (name, price_monthly, max_publishers, max_offers, monthly_conversions, features)
VALUES
  ('Starter', 99.00, 5, 10, 1000, '["5 Publishers", "10 Offers", "1K Conversions/mo", "Basic Dashboard"]'),
  ('Growth', 299.00, 20, 50, 5000, '["20 Publishers", "50 Offers", "5K Conversions/mo", "Advanced Analytics", "Landing Builder"]'),
  ('Pro', 799.00, 999, 999, 20000, '["Unlimited Publishers", "Unlimited Offers", "20K Conversions/mo", "All Features", "Priority Support"]')
ON CONFLICT DO NOTHING;

-- 4. ADD org_id TO EXISTING TABLES
ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(id);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(id);
ALTER TABLE publishers ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(id);
ALTER TABLE publisher_offers ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(id);
ALTER TABLE pin_sessions ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(id);
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(id);
ALTER TABLE offer_parameters ADD COLUMN IF NOT EXISTS org_id INT REFERENCES organizations(id);

-- 5. DEFAULT ORG FOR EXISTING DATA
INSERT INTO organizations (id, name, slug, plan, status, max_publishers, max_offers, monthly_conversions)
VALUES (1, 'Default Org', 'default', 'pro', 'active', 999, 999, 999999)
ON CONFLICT DO NOTHING;

-- Update existing data with default org
UPDATE advertisers SET org_id = 1 WHERE org_id IS NULL;
UPDATE offers SET org_id = 1 WHERE org_id IS NULL;
UPDATE publishers SET org_id = 1 WHERE org_id IS NULL;
UPDATE publisher_offers SET org_id = 1 WHERE org_id IS NULL;
UPDATE pin_sessions SET org_id = 1 WHERE org_id IS NULL;
UPDATE landing_pages SET org_id = 1 WHERE org_id IS NULL;
UPDATE offer_parameters SET org_id = 1 WHERE org_id IS NULL;

-- 6. DEFAULT ADMIN USER
INSERT INTO users (org_id, email, password_hash, role)
VALUES (1, 'admin@mob13r.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'owner')
ON CONFLICT DO NOTHING;
