-- =============================================
-- A-LA-CARTE MODULE PRICING
-- Each module (CPA/CPI/CPS/DCB/MVAS) has its own price + limits.
-- An org's total plan cost = sum of the modules they've enabled
-- (verticals table for CPA-suite, organizations.mvas_enabled for MVAS).
-- =============================================

CREATE TABLE IF NOT EXISTS module_plans (
  code             VARCHAR(10) PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  price_monthly    NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_campaigns    INT,            -- CPA-suite only (CPA/CPI/CPS/DCB); NULL = not applicable
  max_publishers   INT,            -- applies to both CPA-suite and MVAS
  max_offers       INT,            -- MVAS only; NULL = not applicable
  monthly_conversions INT,         -- MVAS only; NULL = not applicable
  description      TEXT,
  display_order    INT DEFAULT 0
);

-- Placeholder starting prices/limits — edit freely, this is just a sane default
-- so the Plans/Signup pages have real numbers to show instead of blanks.
INSERT INTO module_plans (code, name, price_monthly, max_campaigns, max_publishers, description, display_order) VALUES
  ('CPA', 'CPA', 29.00, 10, 20, 'Cost-per-action campaigns with publisher payout & hold % control', 1),
  ('CPI', 'CPI', 29.00, 10, 20, 'Cost-per-install campaigns for app installs', 2),
  ('CPS', 'CPS', 29.00, 10, 20, 'Cost-per-sale campaigns for ecommerce/affiliate sales', 3),
  ('DCB', 'DCB', 29.00, 10, 20, 'Direct carrier billing campaigns (CPA-suite version)', 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO module_plans (code, name, price_monthly, max_publishers, max_offers, monthly_conversions, description, display_order) VALUES
  ('MVAS', 'In-app MVAS', 79.00, 10, 25, 5000, 'Full OTP/PIN-based mobile billing suite — Offers, Publishers, Assign Offers, Landing Builder, Carriers, Offer Groups and more', 5)
ON CONFLICT (code) DO NOTHING;

-- Requests to change modules/plan — admin reviews and applies manually
-- (matches the existing manual-approval workflow, no auto-billing).
CREATE TABLE IF NOT EXISTS plan_requests (
  id             SERIAL PRIMARY KEY,
  org_id         INT NOT NULL REFERENCES organizations(id),
  requested_by   VARCHAR(255),
  requested_modules TEXT[] NOT NULL,   -- e.g. {CPA,CPI,MVAS}
  total_price    NUMERIC(10,2),
  status         VARCHAR(20) DEFAULT 'pending', -- pending / approved / rejected
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_plan_requests_org ON plan_requests(org_id, status);
