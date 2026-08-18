-- =============================================
-- GEO CALLING CODES — manageable from the dashboard
-- Previously the list of country calling codes (+964, +968 etc) used on
-- the landing page's mobile-number entry was hardcoded in frontend code.
-- Moving it into the existing `geos` table so it's fully manageable from
-- the Carriers page — no code edits needed to add a new country.
-- =============================================
ALTER TABLE geos ADD COLUMN IF NOT EXISTS calling_code VARCHAR(10);

-- Seed the geos this system already uses everywhere else (matches the
-- previously-hardcoded PRESET_GEOS/GEO_CALLING_CODES lists), so nothing
-- breaks for existing offers/landing pages.
INSERT INTO geos (code, name, calling_code) VALUES
  ('IQ', 'Iraq', '+964'),
  ('AE', 'UAE', '+971'),
  ('SA', 'Saudi Arabia (KSA)', '+966'),
  ('PS', 'Palestine', '+970'),
  ('LK', 'Sri Lanka', '+94'),
  ('QA', 'Qatar', '+974'),
  ('OM', 'Oman', '+968')
ON CONFLICT (code) DO UPDATE SET calling_code = EXCLUDED.calling_code;
