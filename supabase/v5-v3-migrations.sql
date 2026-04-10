-- ═══════════════════════════════════════════════════════════════════
-- Jacob Co Creative — V3 Migrations
-- Run ALL of these in Supabase SQL Editor before deploying V3
-- ═══════════════════════════════════════════════════════════════════

-- ── Transport fields on events ────────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS dropoff_time timestamptz,
  ADD COLUMN IF NOT EXISTS dropoff_driver text,
  ADD COLUMN IF NOT EXISTS pickup_time timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_driver text;

-- ── Dual beam cover color on event cards ──────────────────────────────────────
ALTER TABLE event_cards
  ADD COLUMN IF NOT EXISTS dual_beam_cover_color text;

-- ── Inventory enhancements ────────────────────────────────────────────────────
ALTER TABLE inventory_cases
  ADD COLUMN IF NOT EXISTS price_per_light decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS serial_numbers jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb;

-- ── Haze Machines ─────────────────────────────────────────────────────────────
INSERT INTO inventory_cases
  (name, type, letter, sort_order, shop, standard_light_count, actual_light_count)
VALUES ('Haze Machines', 'Haze', 'A', 999, 'Orlando', 2, 2)
ON CONFLICT DO NOTHING;

-- ── Globe locations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS globe_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city text NOT NULL,
  state text,
  country text NOT NULL,
  lat decimal NOT NULL,
  lng decimal NOT NULL,
  flag text,
  state_name text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS with open policy
ALTER TABLE globe_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "globe_locations open access" ON globe_locations;
CREATE POLICY "globe_locations open access" ON globe_locations
  FOR ALL USING (true) WITH CHECK (true);

-- Seed locations
INSERT INTO globe_locations (city, state, country, lat, lng, flag, state_name) VALUES
  ('Dallas', 'Texas', 'USA', 32.7767, -96.7970, '🇺🇸', 'Texas'),
  ('Palm Beach', 'Florida', 'USA', 26.7056, -80.0364, '🇺🇸', 'Florida'),
  ('Seaside', 'Florida', 'USA', 30.3266, -86.1414, '🇺🇸', 'Florida'),
  ('Orlando', 'Florida', 'USA', 28.5383, -81.3792, '🇺🇸', 'Florida')
ON CONFLICT DO NOTHING;

-- ── Pricing settings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  light_type text UNIQUE NOT NULL,
  price_per_day decimal(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pricing_settings open access" ON pricing_settings;
CREATE POLICY "pricing_settings open access" ON pricing_settings
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO pricing_settings (light_type, price_per_day) VALUES
  ('Dacore', 10),
  ('Pinspot', 25),
  ('Dual Beam', 15),
  ('Gobo', 50),
  ('Super Spot', 100),
  ('Pixel Brick', 30),
  ('Pixel Tube', 40),
  ('AX2', 50),
  ('AX5', 40),
  ('Plutos', 50),
  ('Chandelier', 10),
  ('Dome Lights', 10),
  ('Haze', 200)
ON CONFLICT (light_type) DO UPDATE SET price_per_day = EXCLUDED.price_per_day;

-- ── Tasks (Rundown) ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  priority text CHECK (priority IN ('urgent','high','medium','low')) DEFAULT 'medium',
  status text CHECK (status IN ('todo','in_progress','done')) DEFAULT 'todo',
  category text CHECK (category IN ('shop','events','admin','finance','other')) DEFAULT 'other',
  assigned_to text[] DEFAULT '{}',
  due_date date,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by text
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks open access" ON tasks;
CREATE POLICY "tasks open access" ON tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS task_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  author text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_comments open access" ON task_comments;
CREATE POLICY "task_comments open access" ON task_comments
  FOR ALL USING (true) WITH CHECK (true);

-- ── Price per light values ────────────────────────────────────────────────────
UPDATE inventory_cases SET price_per_light = 179 WHERE type = 'Dacore';
UPDATE inventory_cases SET price_per_light = 150 WHERE type = 'Pinspot';
UPDATE inventory_cases SET price_per_light = 189 WHERE type = 'Dual Beam';
UPDATE inventory_cases SET price_per_light = 400 WHERE type = 'Pixel Brick';
UPDATE inventory_cases SET price_per_light = 500 WHERE type = 'Pixel Tube';
UPDATE inventory_cases SET price_per_light = 1500 WHERE type = 'AX2';
UPDATE inventory_cases SET price_per_light = 775 WHERE type = 'AX5';
UPDATE inventory_cases SET price_per_light = 2000 WHERE type = 'Plutos';
