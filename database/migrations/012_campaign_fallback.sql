-- =============================================
-- Campaign Fallback support (mirrors offers.service_type)
-- Lets an admin mark a campaign as the FALLBACK for its geo+carrier —
-- when the primary campaign (or its whole traffic group) is capped or
-- inactive, /click transparently routes to the fallback campaign
-- instead, using the SAME tracking URL the affiliate already has.
-- =============================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
    CHECK (service_type IN ('NORMAL', 'FALLBACK'));

CREATE INDEX IF NOT EXISTS idx_campaigns_fallback_lookup
  ON campaigns(org_id, geo, carrier, service_type, status);
