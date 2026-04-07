-- Jacob Co Operations — v3 Real Inventory Seed
-- Replaces all inventory_cases with the actual physical inventory.
--
-- WARNING: Step 1 removes all non-custom event card assignments
-- (cards that link a real case to an event). Custom cards are preserved.
-- Run in Supabase dashboard → SQL Editor.
-- Safe to re-run: DELETE + INSERT is fully idempotent.

-- ============================================================
-- 1. Remove event_card references to inventory_cases
--    (required to satisfy the FK before deleting cases)
-- ============================================================
DELETE FROM event_cards WHERE inventory_case_id IS NOT NULL;

-- ============================================================
-- 2. Clear all existing inventory cases
-- ============================================================
DELETE FROM inventory_cases;

-- ============================================================
-- 3. Insert real inventory (63 cases total)
--    Columns: type, letter, sort_order, shop,
--             standard_light_count (full count),
--             actual_light_count   (current count),
--             has_issue, issue_note
-- ============================================================
INSERT INTO inventory_cases
  (type, letter, sort_order, shop, standard_light_count, actual_light_count, has_issue, issue_note)
VALUES

  -- ── DACORE (full = 48) ──────────────────────────────────
  ('Dacore', 'A', 100, 'Orlando', 48, 48, false, NULL),
  ('Dacore', 'B', 101, 'Orlando', 48, 45, false, NULL),  -- partial
  ('Dacore', 'C', 102, 'Orlando', 48, 48, false, NULL),
  ('Dacore', 'D', 103, 'Orlando', 48, 45, false, NULL),  -- partial

  -- ── PINSPOT (full = 30) ─────────────────────────────────
  ('Pinspot', 'A', 200, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'B', 201, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'C', 202, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'D', 203, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'E', 204, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'F', 205, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'G', 206, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'H', 207, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'I', 208, 'Orlando', 30, 30, false, NULL),
  ('Pinspot', 'J', 209, 'Orlando', 30, 20, false, NULL),  -- partial
  ('Pinspot', 'K', 210, 'Orlando', 30,  0, true,  'In repair'),
  ('Pinspot', 'L', 211, 'Orlando', 30,  0, true,  'In repair'),

  -- ── DUAL BEAM (full = 30) ───────────────────────────────
  ('Dual Beam', 'A', 300, 'Orlando', 30, 30, false, NULL),
  ('Dual Beam', 'B', 301, 'Orlando', 30, 30, false, NULL),
  ('Dual Beam', 'C', 302, 'Orlando', 30, 30, false, NULL),

  -- ── GOBO (full = 6) ─────────────────────────────────────
  ('Gobo', 'A', 400, 'Orlando', 6, 6, false, NULL),
  ('Gobo', 'B', 401, 'Orlando', 6, 6, false, NULL),
  ('Gobo', 'C', 402, 'Orlando', 6, 2, false, NULL),  -- partial

  -- ── SUPER SPOT (full = 4) ───────────────────────────────
  ('Super Spot', 'C', 500, 'Orlando', 4, 4, false, NULL),

  -- ── PIXEL BRICK (full = 16) ─────────────────────────────
  ('Pixel Brick', 'A', 600, 'Orlando', 16, 16, false, NULL),
  ('Pixel Brick', 'B', 601, 'Orlando', 16, 16, false, NULL),
  ('Pixel Brick', 'C', 602, 'Orlando', 16, 16, false, NULL),
  ('Pixel Brick', 'D', 603, 'Orlando', 16, 16, false, NULL),
  ('Pixel Brick', 'E', 604, 'Orlando', 16, 16, false, NULL),
  ('Pixel Brick', 'F', 605, 'Orlando', 16, 16, false, NULL),

  -- ── PIXEL TUBE (full = 8) ───────────────────────────────
  ('Pixel Tube', 'A', 700, 'Orlando', 8, 6, false, NULL),  -- partial
  ('Pixel Tube', 'B', 701, 'Orlando', 8, 6, false, NULL),  -- partial
  ('Pixel Tube', 'C', 702, 'Orlando', 8, 8, false, NULL),
  ('Pixel Tube', 'D', 703, 'Orlando', 8, 8, false, NULL),
  ('Pixel Tube', 'E', 704, 'Orlando', 8, 8, false, NULL),
  ('Pixel Tube', 'F', 705, 'Orlando', 8, 8, false, NULL),
  ('Pixel Tube', 'G', 706, 'Orlando', 8, 8, false, NULL),
  ('Pixel Tube', 'H', 707, 'Orlando', 8, 8, false, NULL),
  -- Note: Pixel Tube I removed (not in physical inventory)

  -- ── AX2 (full = 2) ──────────────────────────────────────
  ('AX2', 'A', 800, 'Orlando', 2, 2, false, NULL),
  ('AX2', 'B', 801, 'Orlando', 2, 2, false, NULL),
  ('AX2', 'C', 802, 'Orlando', 2, 2, false, NULL),
  ('AX2', 'D', 803, 'Orlando', 2, 2, false, NULL),
  ('AX2', 'E', 804, 'Orlando', 2, 2, false, NULL),
  ('AX2', 'F', 805, 'Orlando', 2, 2, false, NULL),
  ('AX2', 'G', 806, 'Orlando', 2, 2, false, NULL),

  -- ── AX5 (full = 6) ──────────────────────────────────────
  ('AX5', 'A', 900, 'Orlando', 6, 6, false, NULL),
  ('AX5', 'B', 901, 'Orlando', 6, 6, false, NULL),
  ('AX5', 'C', 902, 'Orlando', 6, 6, false, NULL),
  ('AX5', 'D', 903, 'Orlando', 6, 6, false, NULL),
  ('AX5', 'E', 904, 'Orlando', 6, 6, false, NULL),
  ('AX5', 'F', 905, 'Orlando', 6, 6, false, NULL),
  ('AX5', 'G', 906, 'Orlando', 6, 6, false, NULL),
  ('AX5', 'H', 907, 'Orlando', 6, 6, false, NULL),

  -- ── PLUTOS (full = 2) ───────────────────────────────────
  ('Plutos', 'A', 1000, 'Orlando', 2, 2, false, NULL),

  -- ── CHANDELIER (full = 18) ──────────────────────────────
  ('Chandelier', 'A', 1100, 'Orlando', 18, 18, false, NULL),

  -- ── DOME LIGHTS (full = 48) ─────────────────────────────
  ('Dome Lights', 'A', 1200, 'Orlando', 48, 48, false, NULL),
  ('Dome Lights', 'B', 1201, 'Orlando', 48, 48, false, NULL),
  ('Dome Lights', 'C', 1202, 'Orlando', 48, 15, false, NULL),  -- partial

  -- ── CIRCLE BRACKETS (full = 14) ─────────────────────────
  ('Circle Brackets', 'A', 1300, 'Orlando', 14, 14, false, NULL),

  -- ── AIR WALL TRACK (full = 12) ──────────────────────────
  ('Air Wall Track', 'A', 1400, 'Orlando', 12, 12, false, NULL),
  ('Air Wall Track', 'B', 1401, 'Orlando', 12, 12, false, NULL),
  ('Air Wall Track', 'C', 1402, 'Orlando', 12, 12, false, NULL),

  -- ── CLAMP BRACKETS TREE (full = 10) ─────────────────────
  ('Clamp Brackets Tree', 'A', 1500, 'Orlando', 10, 10, false, NULL),
  ('Clamp Brackets Tree', 'B', 1501, 'Orlando', 10, 10, false, NULL);

-- ============================================================
-- Verification — should return 63
-- SELECT COUNT(*) FROM inventory_cases;
-- ============================================================
