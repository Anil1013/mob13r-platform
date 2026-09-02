-- =============================================
-- Publisher-scoped traffic groups
-- Allows MULTIPLE active campaign_groups for the same geo+carrier — as
-- long as each is scoped to a DIFFERENT publisher (affiliate_id), or is
-- the one "generic" group (affiliate_id IS NULL) that applies to any
-- publisher with no publisher-specific group of their own.
-- =============================================

-- Drop the old constraint that only allowed ONE active group per
-- geo+carrier total, regardless of publisher.
DROP INDEX IF EXISTS idx_campaign_groups_unique_active_geo_carrier;

ALTER TABLE campaign_groups
  ADD COLUMN IF NOT EXISTS affiliate_id INT REFERENCES affiliates(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_campaign_groups_affiliate ON campaign_groups(affiliate_id);

-- At most ONE active publisher-specific group per (org, geo, carrier, publisher).
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_groups_unique_active_publisher_scoped
  ON campaign_groups(org_id, geo, carrier, affiliate_id)
  WHERE status = 'active' AND affiliate_id IS NOT NULL;

-- At most ONE active GENERIC (no specific publisher) group per (org, geo,
-- carrier) — a plain UNIQUE index would NOT catch multiple NULL
-- affiliate_id rows (NULL is never "equal" to NULL in SQL uniqueness),
-- so this needs its own separate partial index restricted to the NULL case.
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_groups_unique_active_generic
  ON campaign_groups(org_id, geo, carrier)
  WHERE status = 'active' AND affiliate_id IS NULL;
