-- =============================================
-- TIERED MODULE PRICING
-- Each module (CPA/CPI/CPS/DCB/MVAS) now has multiple tiers
-- (basic/growth/pro), each with its own price + higher limits.
-- An org picks a tier PER module (not just on/off) — e.g. CPA on
-- Growth tier gets more publisher/campaign capacity than CPA on Basic,
-- at a higher price. This is how capacity (like "more publishers")
-- scales the monthly amount.
-- =============================================

-- 1. module_plans: add tier, make (code, tier) the identity instead of just code
ALTER TABLE module_plans ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'basic';
ALTER TABLE module_plans DROP CONSTRAINT IF EXISTS module_plans_pkey;
ALTER TABLE module_plans ADD PRIMARY KEY (code, tier);

-- 2. Track which tier an org is on, per module.
--    CPA-suite (CPA/CPI/CPS/DCB): tier lives on the verticals row itself.
ALTER TABLE verticals ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'basic';
--    MVAS: tier lives on organizations (MVAS isn't in the verticals table).
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mvas_tier VARCHAR(20) NOT NULL DEFAULT 'basic';

-- 3. plan_requests: requested_modules used to be a flat text[] of codes;
--    now needs to carry the requested tier per module too. Add a jsonb
--    column for the new tier-aware format going forward; keep the old
--    column so nothing already written breaks.
ALTER TABLE plan_requests ADD COLUMN IF NOT EXISTS requested_modules_tiered JSONB;

-- 4. Seed Growth + Pro tiers for every module (Basic tier rows already
--    exist from migration 008 with tier defaulting to 'basic').
UPDATE module_plans SET tier = 'basic' WHERE tier IS NULL;

INSERT INTO module_plans (code, tier, name, price_monthly, max_campaigns, max_publishers, description, display_order) VALUES
  ('CPA', 'growth', 'CPA — Growth', 59.00, 30, 50, 'More capacity: 30 campaigns, 50 publishers', 1),
  ('CPA', 'pro',    'CPA — Pro',    99.00, NULL, NULL, 'Unlimited campaigns and publishers', 1),
  ('CPI', 'growth', 'CPI — Growth', 59.00, 30, 50, 'More capacity: 30 campaigns, 50 publishers', 2),
  ('CPI', 'pro',    'CPI — Pro',    99.00, NULL, NULL, 'Unlimited campaigns and publishers', 2),
  ('CPS', 'growth', 'CPS — Growth', 59.00, 30, 50, 'More capacity: 30 campaigns, 50 publishers', 3),
  ('CPS', 'pro',    'CPS — Pro',    99.00, NULL, NULL, 'Unlimited campaigns and publishers', 3),
  ('DCB', 'growth', 'DCB — Growth', 59.00, 30, 50, 'More capacity: 30 campaigns, 50 publishers', 4),
  ('DCB', 'pro',    'DCB — Pro',    99.00, NULL, NULL, 'Unlimited campaigns and publishers', 4)
ON CONFLICT (code, tier) DO NOTHING;

INSERT INTO module_plans (code, tier, name, price_monthly, max_publishers, max_offers, monthly_conversions, description, display_order) VALUES
  ('MVAS', 'growth', 'In-app MVAS — Growth', 149.00, 25, 50, 15000, 'More capacity: 25 publishers, 50 offers, 15K conversions/mo', 5),
  ('MVAS', 'pro',    'In-app MVAS — Pro',    299.00, NULL, NULL, NULL, 'Unlimited publishers/offers/conversions', 5)
ON CONFLICT (code, tier) DO NOTHING;
