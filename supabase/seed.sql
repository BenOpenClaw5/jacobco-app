-- Seed script for inventory cases
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING

INSERT INTO inventory_cases (type, letter, sort_order) VALUES
  ('Dacore', 'A', 100),
  ('Dacore', 'B', 101),
  ('Dacore', 'C', 102),
  ('Dacore', 'D', 103),

  ('Pinspot', 'A', 200),
  ('Pinspot', 'B', 201),
  ('Pinspot', 'C', 202),
  ('Pinspot', 'D', 203),
  ('Pinspot', 'E', 204),
  ('Pinspot', 'F', 205),
  ('Pinspot', 'G', 206),
  ('Pinspot', 'H', 207),
  ('Pinspot', 'I', 208),
  ('Pinspot', 'J', 209),

  ('Dual Beam', 'A', 300),
  ('Dual Beam', 'B', 301),
  ('Dual Beam', 'C', 302),

  ('Gobo', 'A', 400),
  ('Gobo', 'B', 401),
  ('Gobo', 'C', 402),

  ('Super Spot', 'C', 500),

  ('Pixel Brick', 'A', 600),
  ('Pixel Brick', 'B', 601),
  ('Pixel Brick', 'C', 602),
  ('Pixel Brick', 'D', 603),
  ('Pixel Brick', 'E', 604),
  ('Pixel Brick', 'F', 605),

  ('Pixel Tube', 'A', 700),
  ('Pixel Tube', 'B', 701),
  ('Pixel Tube', 'C', 702),
  ('Pixel Tube', 'D', 703),
  ('Pixel Tube', 'E', 704),
  ('Pixel Tube', 'F', 705),
  ('Pixel Tube', 'G', 706),
  ('Pixel Tube', 'H', 707),
  ('Pixel Tube', 'I', 708),

  ('AX2', 'A', 800),
  ('AX2', 'B', 801),
  ('AX2', 'C', 802),
  ('AX2', 'D', 803),
  ('AX2', 'E', 804),
  ('AX2', 'F', 805),
  ('AX2', 'G', 806),

  ('AX5', 'A', 900),
  ('AX5', 'B', 901),
  ('AX5', 'C', 902),
  ('AX5', 'D', 903),
  ('AX5', 'E', 904),
  ('AX5', 'F', 905),
  ('AX5', 'G', 906),
  ('AX5', 'H', 907),

  ('Plutos', 'A', 1000),

  ('Chandelier', 'A', 1100),

  ('Dome Lights', 'A', 1200),
  ('Dome Lights', 'B', 1201),
  ('Dome Lights', 'C', 1202),

  ('Circle brackets', 'A', 1300),

  ('Air Wall Track', 'A', 1400),
  ('Air Wall Track', 'B', 1401),
  ('Air Wall Track', 'C', 1402),

  ('Clamp brackets tree', 'A', 1500),
  ('Clamp brackets tree', 'B', 1501)

ON CONFLICT (type, letter) DO NOTHING;
