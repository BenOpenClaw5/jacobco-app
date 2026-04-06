-- Jacob Co Event Prep Board — Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- INVENTORY CASES (global)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  letter TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(type, letter)
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  load_by_date DATE,
  event_start_date DATE,
  event_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENT CARDS
-- Tracks assignment of cases (real or custom) to events.
-- For real inventory cards: inventory_case_id is set, is_custom = false
-- For custom cards: is_custom = true, custom_name + custom_color set
-- stage: NULL = in inventory pool for this event
-- ============================================================
CREATE TABLE IF NOT EXISTS event_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  inventory_case_id UUID REFERENCES inventory_cases(id),
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  custom_name TEXT,
  custom_color TEXT,
  stage TEXT CHECK (stage IN ('invoice', 'charging', 'prepped', 'loaded')),
  notes TEXT,
  approved_by TEXT,
  prepped_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A real inventory card can only appear once per event
  CONSTRAINT unique_inventory_per_event UNIQUE (event_id, inventory_case_id)
);

-- ============================================================
-- EVENT CARD IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS event_card_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_card_id UUID NOT NULL REFERENCES event_cards(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_event_cards_event_id ON event_cards(event_id);
CREATE INDEX IF NOT EXISTS idx_event_cards_inventory_case_id ON event_cards(inventory_case_id);
CREATE INDEX IF NOT EXISTS idx_event_card_images_event_card_id ON event_card_images(event_card_id);
CREATE INDEX IF NOT EXISTS idx_inventory_cases_sort ON inventory_cases(sort_order);

-- ============================================================
-- ROW LEVEL SECURITY — PUBLIC ACCESS FOR V1
-- (No auth required — all reads and writes are open)
-- ============================================================
ALTER TABLE inventory_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_card_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_inventory_cases" ON inventory_cases FOR SELECT USING (true);
CREATE POLICY "public_all_events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_event_cards" ON event_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_event_card_images" ON event_card_images FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_cards_updated_at
  BEFORE UPDATE ON event_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
