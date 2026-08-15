-- =============================================
-- CPA MODULE — Carrier field, weighted traffic
-- groups, publisher assignments (payout + hold %)
-- =============================================

-- 1. Carrier on campaigns (shown right after Geo in the form)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);

-- 2. TRAFFIC GROUPS — bundle multiple campaigns (same geo/carrier) behind ONE
--    tracking URL. Traffic is split across the group's campaigns by weight %.
CREATE TABLE IF NOT EXISTS campaign_groups (
  id             SERIAL PRIMARY KEY,
  org_id         INT NOT NULL REFERENCES organizations(id),
  name           VARCHAR(255) NOT NULL,
  geo            VARCHAR(10),
  carrier        VARCHAR(100),
  tracking_slug  VARCHAR(64) UNIQUE NOT NULL,
  status         VARCHAR(20) DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_group_items (
  id          SERIAL PRIMARY KEY,
  group_id    INT NOT NULL REFERENCES campaign_groups(id) ON DELETE CASCADE,
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  weight      INT NOT NULL DEFAULT 100 CHECK (weight >= 0 AND weight <= 100),
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, campaign_id)
);

-- 3. PUBLISHER ASSIGNMENTS — this is where a publisher gets tied to a single
--    campaign OR a whole traffic group, with their OWN payout (what we pay
--    them — can be less than what the advertiser pays us) and an optional
--    hold_percent (what % of their conversions we intentionally do NOT
--    forward to their postback — for quality control / margin holdback).
CREATE TABLE IF NOT EXISTS publisher_assignments (
  id               SERIAL PRIMARY KEY,
  org_id           INT NOT NULL REFERENCES organizations(id),
  affiliate_id     INT NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  campaign_id      INT REFERENCES campaigns(id) ON DELETE CASCADE,
  group_id         INT REFERENCES campaign_groups(id) ON DELETE CASCADE,
  publisher_payout DECIMAL(10,2) NOT NULL,
  hold_percent     INT NOT NULL DEFAULT 0 CHECK (hold_percent >= 0 AND hold_percent <= 100),
  status           VARCHAR(20) DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CHECK ((campaign_id IS NOT NULL AND group_id IS NULL) OR (campaign_id IS NULL AND group_id IS NOT NULL))
);

-- 4. Conversions now record BOTH sides of the payout, and whether a
--    conversion was intentionally held back from the publisher.
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS advertiser_payout DECIMAL(10,2);
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS publisher_payout DECIMAL(10,2);
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS is_held BOOLEAN DEFAULT FALSE;

-- backfill advertiser_payout from the existing payout column for old rows
UPDATE conversions SET advertiser_payout = payout WHERE advertiser_payout IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_group_items_group ON campaign_group_items(group_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_group_items_campaign ON campaign_group_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_publisher_assignments_aff ON publisher_assignments(affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_publisher_assignments_campaign ON publisher_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_publisher_assignments_group ON publisher_assignments(group_id);
