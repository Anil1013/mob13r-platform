-- =============================================
-- Publisher-scoped offer groups (DCB) — brings Offer Groups to feature
-- parity with CPA's Traffic Groups.
-- Allows MULTIPLE active offer_groups for the same geo+carrier — as
-- long as each is scoped to a DIFFERENT publisher (publisher_id), or is
-- the one "generic" group (publisher_id IS NULL) that applies to any
-- publisher with no publisher-specific group of their own.
-- =============================================

ALTER TABLE offer_groups
  ADD COLUMN IF NOT EXISTS publisher_id INT REFERENCES publishers(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_offer_groups_publisher ON offer_groups(publisher_id);

-- At most ONE active publisher-specific group per (org, geo, carrier, publisher).
CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_groups_unique_active_publisher_scoped
  ON offer_groups(org_id, geo, carrier, publisher_id)
  WHERE status = 'active' AND publisher_id IS NOT NULL;

-- At most ONE active GENERIC (no specific publisher) group per (org, geo, carrier).
CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_groups_unique_active_generic
  ON offer_groups(org_id, geo, carrier)
  WHERE status = 'active' AND publisher_id IS NULL;
