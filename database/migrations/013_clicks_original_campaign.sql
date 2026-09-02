-- =============================================
-- Track original vs actually-served campaign on clicks
-- Needed for the new automatic traffic-diversion system (weighted group
-- distribution + fallback): when a click gets silently redirected to a
-- DIFFERENT campaign than the one the affiliate's link pointed to,
-- postback crediting must still be able to find the publisher's
-- assignment (which references what they were ORIGINALLY given, not
-- whatever ended up serving the traffic).
-- =============================================

ALTER TABLE clicks
  ADD COLUMN IF NOT EXISTS original_campaign_id INT REFERENCES campaigns(id);

-- Backfill: for all existing rows, original = whatever campaign_id already
-- has (they were the same thing before this diversion system existed).
UPDATE clicks SET original_campaign_id = campaign_id WHERE original_campaign_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_clicks_original_campaign ON clicks(original_campaign_id);
