-- 022_expand_urban_categories.sql
-- Expand urban incident categories to cover comprehensive smart city issues

INSERT INTO categories (name, description, icon, color, icon_url, color_code, severity_weight, is_active)
VALUES
  ('Clogged Drain', 'Blocked storm drains, grates, or missing manhole covers', '💧', '#0D9488', '💧', '#0D9488', 3, TRUE),
  ('Sidewalk & Encroachment', 'Damaged sidewalks, illegal parking, or street encroachment', '🚶', '#B45309', '🚶', '#B45309', 2, TRUE),
  ('Traffic Signals & Signs', 'Broken traffic lights, damaged road signs, or faded markings', '🚦', '#2563EB', '🚦', '#2563EB', 3, TRUE),
  ('Noise & Air Pollution', 'Excessive noise, illegal burning, dust, or air pollution', '🔊', '#DB2777', '🔊', '#DB2777', 2, TRUE),
  ('Overhead Cables & Wiring', 'Low-hanging, tangled, or snapped telecom and utility cables', '🔌', '#7C3AED', '🔌', '#7C3AED', 4, TRUE),
  ('Fire & Emergency Hazard', 'Smoke, fire hazards, chemical spills, or urgent structural risks', '🔥', '#DC2626', '🔥', '#DC2626', 5, TRUE),
  ('Other Urban Issues', 'Other urban infrastructure, environment, or community issues', '📌', '#475569', '📌', '#475569', 1, TRUE)
ON CONFLICT (name) DO UPDATE
SET
  description = COALESCE(categories.description, EXCLUDED.description),
  icon = COALESCE(categories.icon, EXCLUDED.icon),
  color = COALESCE(categories.color, EXCLUDED.color),
  is_active = TRUE;
