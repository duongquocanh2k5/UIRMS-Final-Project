UPDATE categories
SET description = 'Potholes, cracked or damaged road surfaces'
WHERE name = 'Road Damage';
UPDATE categories
SET name = 'Road Damage', description = 'Potholes, cracked or damaged road surfaces'
WHERE name = 'Đường hỏng'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Road Damage');
UPDATE categories
SET name = 'Road Damage', description = 'Potholes, cracked or damaged road surfaces'
WHERE name = 'Ổ gà'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Road Damage');

UPDATE categories
SET description = 'Broken streetlights, traffic signals, or power outages'
WHERE name = 'Streetlight & Power';
UPDATE categories
SET name = 'Streetlight & Power', description = 'Broken streetlights, traffic signals, or power outages'
WHERE name = 'Mất điện'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Streetlight & Power');
UPDATE categories
SET name = 'Streetlight & Power', description = 'Broken streetlights, traffic signals, or power outages'
WHERE name = 'Đèn bị hư'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Streetlight & Power');
UPDATE categories
SET name = 'Streetlight & Power', description = 'Broken streetlights, traffic signals, or power outages'
WHERE name = 'Đèn đường'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Streetlight & Power');

UPDATE categories
SET name = 'Traffic Congestion', description = 'Traffic jams or road blockages'
WHERE name = 'Tắc đường'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Traffic Congestion');
UPDATE categories
SET description = 'Traffic jams or road blockages'
WHERE name = 'Traffic Congestion';

UPDATE categories
SET description = 'Uncollected trash or illegal dumping in public areas'
WHERE name = 'Waste & Litter';
UPDATE categories
SET name = 'Waste & Litter', description = 'Uncollected trash or illegal dumping in public areas'
WHERE name = 'Rác thải'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Waste & Litter');
UPDATE categories
SET name = 'Waste & Litter', description = 'Uncollected trash or illegal dumping in public areas'
WHERE name = 'Rác trên đường'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Waste & Litter');

UPDATE categories
SET description = 'Public safety hazards or emergencies'
WHERE name = 'Public Safety';
UPDATE categories
SET name = 'Public Safety', description = 'Public safety hazards or emergencies'
WHERE name = 'An toàn công cộng'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Public Safety');

UPDATE categories
SET description = 'Fallen trees or hazardous branches'
WHERE name = 'Fallen / Damaged Trees';
UPDATE categories
SET name = 'Fallen / Damaged Trees', description = 'Fallen trees or hazardous branches'
WHERE name = 'Cây cối'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fallen / Damaged Trees');
UPDATE categories
SET name = 'Fallen / Damaged Trees', description = 'Fallen trees or hazardous branches'
WHERE name = 'Cây cối hư hỏng'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fallen / Damaged Trees');

UPDATE categories
SET description = 'Street flooding, broken water pipes, or sewage leaks'
WHERE name = 'Flooding & Wastewater';
UPDATE categories
SET name = 'Flooding & Wastewater', description = 'Street flooding, broken water pipes, or sewage leaks'
WHERE name = 'Nước thải'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Flooding & Wastewater');
UPDATE categories
SET name = 'Flooding & Wastewater', description = 'Street flooding, broken water pipes, or sewage leaks'
WHERE name = 'Ngập nước'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Flooding & Wastewater');

UPDATE categories
SET description = 'Blocked storm drains or manholes'
WHERE name = 'Clogged Drain';
UPDATE categories
SET name = 'Clogged Drain', description = 'Blocked storm drains or manholes'
WHERE name = 'Cống tắc'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Clogged Drain');

UPDATE categories
SET description = 'Damaged public elevators or facilities'
WHERE name = 'Public Facility / Elevator';
UPDATE categories
SET name = 'Public Facility / Elevator', description = 'Damaged public elevators or facilities'
WHERE name = 'Thang máy'
  AND NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Public Facility / Elevator');
