-- =============================================
-- CPA MODULE — Per-advertiser postback key,
-- single postback URL per publisher (affiliate)
-- =============================================

-- 1. Each advertiser gets its own unique postback key (so every advertiser
--    has a distinct postback URL, instead of one shared generic URL).
ALTER TABLE advertisers ADD COLUMN IF NOT EXISTS postback_key VARCHAR(64);

UPDATE advertisers
SET postback_key = md5(random()::text || clock_timestamp()::text || id::text)
WHERE postback_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_advertisers_postback_key
  ON advertisers(postback_key) WHERE postback_key IS NOT NULL;

-- 2. Publishers (affiliates) get ONE postback URL that can be edited in place,
--    instead of a list of multiple postback URLs.
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS postback_url TEXT;

-- Migrate any existing multi-postback data (if present) into the single field —
-- picks each affiliate's most recently added active postback URL.
UPDATE affiliates a
SET postback_url = sub.postback_url
FROM (
  SELECT DISTINCT ON (affiliate_id) affiliate_id, postback_url
  FROM affiliate_postbacks
  WHERE status = 'active'
  ORDER BY affiliate_id, created_at DESC
) sub
WHERE a.id = sub.affiliate_id AND a.postback_url IS NULL;
