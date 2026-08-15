-- =============================================
-- CPA MODULE — Verticals, Campaigns, Affiliates,
-- Click Tracking, Postback Conversions
-- (100% additive — does not touch any existing table)
-- =============================================

-- 1. VERTICALS (sidebar groups — CPA / CPI / CPS / DCB etc, hide/unhide)
CREATE TABLE IF NOT EXISTS verticals (
  id            SERIAL PRIMARY KEY,
  org_id        INT NOT NULL REFERENCES organizations(id),
  name          VARCHAR(50) NOT NULL,
  code          VARCHAR(20) NOT NULL,
  icon          VARCHAR(10) DEFAULT '📁',
  is_active     BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, code)
);

-- 2. AFFILIATES (traffic partners for the CPA module — separate from DCB publishers)
CREATE TABLE IF NOT EXISTS affiliates (
  id             SERIAL PRIMARY KEY,
  org_id         INT NOT NULL REFERENCES organizations(id),
  name           VARCHAR(255) NOT NULL,
  email          VARCHAR(255),
  affiliate_key  VARCHAR(100) UNIQUE NOT NULL,
  status         VARCHAR(20) DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CAMPAIGNS (one single tracking URL per campaign, pushed to advertiser)
CREATE TABLE IF NOT EXISTS campaigns (
  id               SERIAL PRIMARY KEY,
  org_id           INT NOT NULL REFERENCES organizations(id),
  vertical_id      INT NOT NULL REFERENCES verticals(id),
  advertiser_id    INT NOT NULL REFERENCES advertisers(id),
  name             VARCHAR(255) NOT NULL,
  tracking_slug    VARCHAR(64) UNIQUE NOT NULL,
  destination_url  TEXT NOT NULL,
  payout           DECIMAL(10,2) DEFAULT 0,
  currency         VARCHAR(10) DEFAULT 'USD',
  geo              VARCHAR(10),
  daily_cap        INT,
  today_clicks     INT DEFAULT 0,
  today_conversions INT DEFAULT 0,
  last_reset_date  DATE DEFAULT CURRENT_DATE,
  status           VARCHAR(20) DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AFFILIATE POSTBACK URLS (where we forward conversions to the affiliate, S2S)
CREATE TABLE IF NOT EXISTS affiliate_postbacks (
  id            SERIAL PRIMARY KEY,
  affiliate_id  INT NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  campaign_id   INT REFERENCES campaigns(id) ON DELETE CASCADE,
  postback_url  TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLICKS (every hit on the campaign tracking URL)
CREATE TABLE IF NOT EXISTS clicks (
  id            BIGSERIAL PRIMARY KEY,
  click_id      VARCHAR(64) UNIQUE NOT NULL,
  org_id        INT NOT NULL,
  campaign_id   INT NOT NULL REFERENCES campaigns(id),
  affiliate_id  INT REFERENCES affiliates(id),
  sub1 VARCHAR(255), sub2 VARCHAR(255), sub3 VARCHAR(255), sub4 VARCHAR(255), sub5 VARCHAR(255),
  ip            VARCHAR(64),
  user_agent    TEXT,
  geo           VARCHAR(10),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CONVERSIONS (postback received from advertiser)
CREATE TABLE IF NOT EXISTS conversions (
  id                  BIGSERIAL PRIMARY KEY,
  org_id              INT NOT NULL,
  click_id            VARCHAR(64) NOT NULL REFERENCES clicks(click_id),
  campaign_id         INT NOT NULL REFERENCES campaigns(id),
  affiliate_id        INT REFERENCES affiliates(id),
  status              VARCHAR(20) DEFAULT 'approved',
  payout              DECIMAL(10,2) DEFAULT 0,
  transaction_id      VARCHAR(150),
  postback_forwarded  BOOLEAN DEFAULT FALSE,
  raw_params          JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(click_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verticals_org ON verticals(org_id, is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(org_id, vertical_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(tracking_slug);
CREATE INDEX IF NOT EXISTS idx_affiliates_org ON affiliates(org_id, status);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign ON clicks(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_affiliate ON clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_conversions_campaign ON conversions(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversions_affiliate ON conversions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_postbacks_aff ON affiliate_postbacks(affiliate_id, campaign_id);

-- 7. Seed default verticals for the existing default org (id=1)
INSERT INTO verticals (org_id, name, code, icon, is_active, display_order) VALUES
  (1, 'CPA', 'CPA', '💰', TRUE, 1),
  (1, 'CPI', 'CPI', '📲', TRUE, 2),
  (1, 'CPS', 'CPS', '🛒', TRUE, 3),
  (1, 'DCB', 'DCB', '📶', TRUE, 4)
ON CONFLICT (org_id, code) DO NOTHING;
