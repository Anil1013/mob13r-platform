-- =============================================
-- Offer Groups — Traffic Distribution/Rotation
-- =============================================

CREATE TABLE IF NOT EXISTS offer_groups (
  id          SERIAL PRIMARY KEY,
  org_id      INT NOT NULL REFERENCES organizations(id),
  name        VARCHAR(255) NOT NULL,
  geo         VARCHAR(10),
  carrier     VARCHAR(100),
  description TEXT,
  status      VARCHAR(20) DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offer_group_items (
  id           SERIAL PRIMARY KEY,
  group_id     INT NOT NULL REFERENCES offer_groups(id) ON DELETE CASCADE,
  offer_id     INT NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  weight       INT NOT NULL DEFAULT 100 CHECK (weight >= 0 AND weight <= 100),
  status       VARCHAR(20) DEFAULT 'active',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, offer_id)
);

CREATE TABLE IF NOT EXISTS offer_group_publisher (
  id           SERIAL PRIMARY KEY,
  group_id     INT NOT NULL REFERENCES offer_groups(id) ON DELETE CASCADE,
  publisher_id INT NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  org_id       INT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, publisher_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offer_groups_org ON offer_groups(org_id, status);
CREATE INDEX IF NOT EXISTS idx_offer_group_items_group ON offer_group_items(group_id, status);
CREATE INDEX IF NOT EXISTS idx_offer_group_publisher ON offer_group_publisher(group_id, publisher_id);
