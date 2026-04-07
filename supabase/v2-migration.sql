-- Jacob Co Operations System — v2 Migration
-- Run this in your Supabase dashboard → SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)

-- ============================================================
-- 1. EXTEND INVENTORY CASES
-- ============================================================
ALTER TABLE inventory_cases
  ADD COLUMN IF NOT EXISTS shop TEXT NOT NULL DEFAULT 'Orlando'
    CHECK (shop IN ('Orlando', 'Dallas')),
  ADD COLUMN IF NOT EXISTS standard_light_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_light_count INTEGER,
  ADD COLUMN IF NOT EXISTS has_issue BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS issue_note TEXT,
  ADD COLUMN IF NOT EXISTS last_updated_by TEXT DEFAULT 'System',
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Seed standard light counts per case type
UPDATE inventory_cases SET standard_light_count = 24 WHERE type = 'Dacore';
UPDATE inventory_cases SET standard_light_count = 36 WHERE type = 'Pinspot';
UPDATE inventory_cases SET standard_light_count = 12 WHERE type = 'Dual Beam';
UPDATE inventory_cases SET standard_light_count = 8  WHERE type = 'Gobo';
UPDATE inventory_cases SET standard_light_count = 6  WHERE type = 'Super Spot';
UPDATE inventory_cases SET standard_light_count = 18 WHERE type = 'Pixel Brick';
UPDATE inventory_cases SET standard_light_count = 24 WHERE type = 'Pixel Tube';
UPDATE inventory_cases SET standard_light_count = 12 WHERE type = 'AX2';
UPDATE inventory_cases SET standard_light_count = 8  WHERE type = 'AX5';
UPDATE inventory_cases SET standard_light_count = 4  WHERE type = 'Plutos';
UPDATE inventory_cases SET standard_light_count = 1  WHERE type = 'Chandelier';
UPDATE inventory_cases SET standard_light_count = 6  WHERE type = 'Dome Lights';
UPDATE inventory_cases SET standard_light_count = 0  WHERE type IN ('Circle brackets', 'Air Wall Track', 'Clamp brackets tree');

-- Set actual counts to match standard (all cases start "full")
UPDATE inventory_cases SET actual_light_count = standard_light_count WHERE actual_light_count IS NULL;

-- ============================================================
-- 2. EXTEND EVENTS
-- ============================================================
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS primary_shop TEXT DEFAULT 'Orlando'
    CHECK (primary_shop IN ('Orlando', 'Dallas')),
  ADD COLUMN IF NOT EXISTS google_doc_url TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_updated_by TEXT DEFAULT 'Guest User',
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 3. EXTEND EVENT CARDS
-- ============================================================
ALTER TABLE event_cards
  ADD COLUMN IF NOT EXISTS last_updated_by TEXT DEFAULT 'Guest User',
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 4. RETURN INCIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS return_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  inventory_case_id UUID NOT NULL REFERENCES inventory_cases(id),
  type TEXT NOT NULL CHECK (type IN ('ok', 'missing', 'note')),
  missing_count INTEGER,
  note TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_by TEXT DEFAULT 'Guest User',
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_incidents_event ON return_incidents(event_id);
CREATE INDEX IF NOT EXISTS idx_return_incidents_case ON return_incidents(inventory_case_id);

ALTER TABLE return_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_return_incidents" ON return_incidents
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. STORAGE: ensure card-images bucket is public
-- ============================================================
UPDATE storage.buckets SET public = true WHERE id = 'card-images';
