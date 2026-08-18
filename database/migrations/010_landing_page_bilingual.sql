-- =============================================
-- BILINGUAL LANDING PAGES — real EN/AR toggle
-- Adds an Arabic version of every translatable text field, so the
-- language toggle on the live page can show genuinely separate,
-- admin-controlled content per language (not just parse combined text).
-- All nullable — pages without Arabic content set just fall back to the
-- English field, so this is fully backward compatible.
-- =============================================
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS subtitle_ar TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS disclaimer_ar TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS button_text_ar TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS verify_button_text_ar TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS success_title_ar TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS success_message_ar TEXT;

-- Which language the page opens in by default (independent from whether a
-- toggle is even shown). 'ar' or 'en'.
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) DEFAULT 'en';

-- Show the EN/AR toggle button at all — some offers may not need it.
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS show_language_toggle BOOLEAN DEFAULT false;

-- Show/hide the small top-right offer logo badge and the title heading —
-- both previously always rendered unconditionally if set.
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS show_logo_badge BOOLEAN DEFAULT true;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS show_title BOOLEAN DEFAULT true;
