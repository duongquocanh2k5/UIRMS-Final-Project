CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  area VARCHAR(100),
  lead_admin_id INTEGER REFERENCES admins(id),
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO departments (name)
SELECT DISTINCT department
FROM admins
WHERE department IS NOT NULL
ON CONFLICT (name) DO NOTHING;

ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);

UPDATE admins
SET department_id = departments.id
FROM departments
WHERE admins.department = departments.name;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS icon VARCHAR(10),
  ADD COLUMN IF NOT EXISTS color VARCHAR(20);

ALTER TABLE admins DROP COLUMN IF EXISTS department;