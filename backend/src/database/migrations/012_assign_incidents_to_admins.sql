-- Assignment fields represent staff accounts, not reported users.

UPDATE incidents i
SET assigned_to = NULL
WHERE assigned_to IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.id = i.assigned_to);

UPDATE incidents i
SET assigned_technician = NULL
WHERE assigned_technician IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.id = i.assigned_technician);

ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_assigned_to_fkey;
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_assigned_technician_fkey;

ALTER TABLE incidents
  ADD CONSTRAINT incidents_assigned_to_admin_fkey
  FOREIGN KEY (assigned_to) REFERENCES admins(id) ON DELETE SET NULL,
  ADD CONSTRAINT incidents_assigned_technician_admin_fkey
  FOREIGN KEY (assigned_technician) REFERENCES admins(id) ON DELETE SET NULL;