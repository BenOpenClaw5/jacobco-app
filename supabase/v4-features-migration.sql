-- Jacob Co — v4 Features Migration
-- Run in Supabase dashboard → SQL Editor
-- Adds: team_members, tools checklist, bookings table, payroll review note

-- ============================================================
-- 1. team_members on events (idempotent)
-- ============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS team_members text[] DEFAULT '{}';

-- ============================================================
-- 2. Tools checklist columns on event_cards
-- ============================================================
ALTER TABLE event_cards ADD COLUMN IF NOT EXISTS checklist_state jsonb DEFAULT '{}';
ALTER TABLE event_cards ADD COLUMN IF NOT EXISTS checklist_packed boolean DEFAULT false;
ALTER TABLE event_cards ADD COLUMN IF NOT EXISTS has_tools_warning boolean DEFAULT false;

-- ============================================================
-- 3. Payroll review note
-- ============================================================
ALTER TABLE payroll_submissions ADD COLUMN IF NOT EXISTS review_note text;

-- ============================================================
-- 4. Bookings table
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'inquiry'
    CHECK (status IN ('inquiry', 'quoted', 'confirmed', 'cancelled')),
  client_name text NOT NULL,
  client_contact text,
  event_name text NOT NULL,
  event_start_date date,
  event_end_date date,
  venue text,
  event_type text,
  budget numeric(10,2),
  notes text,
  primary_shop text NOT NULL DEFAULT 'Orlando',
  equipment_selection jsonb DEFAULT '{}',
  total_price numeric(10,2),
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  last_updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_bookings"
  ON bookings FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(event_start_date, event_end_date);

-- ============================================================
-- 5. Tools cases in inventory (5 cases, Orlando)
-- ============================================================
INSERT INTO inventory_cases
  (type, letter, sort_order, shop, standard_light_count, actual_light_count, has_issue, issue_note)
VALUES
  ('Tools', '1', 1600, 'Orlando', 0, 0, false, NULL),
  ('Tools', '2', 1601, 'Orlando', 0, 0, false, NULL),
  ('Tools', '3', 1602, 'Orlando', 0, 0, false, NULL),
  ('Tools', '4', 1603, 'Orlando', 0, 0, false, NULL),
  ('Tools', '5', 1604, 'Orlando', 0, 0, false, NULL);

-- ============================================================
-- Verify
-- SELECT type, count(*) FROM inventory_cases GROUP BY type ORDER BY type;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'event_cards' ORDER BY ordinal_position;
-- ============================================================
