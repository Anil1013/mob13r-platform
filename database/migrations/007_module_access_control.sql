-- =============================================
-- MODULE-BASED ACCESS CONTROL
-- Lets each organization be scoped to only the verticals/modules
-- they signed up for: CPA / CPI / CPS / DCB (via the `verticals` table,
-- already org-scoped) and/or the legacy Navbar-based "In-app MVAS"
-- system (offers/publishers/pin_sessions — the original DCB billing
-- flow, gated by this new organizations.mvas_enabled flag).
-- =============================================

-- Default TRUE so every existing organization keeps full access —
-- this is purely additive, no existing org loses anything.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mvas_enabled BOOLEAN DEFAULT true;
