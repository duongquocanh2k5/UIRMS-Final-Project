-- 005_create_admins_table.sql
-- Create admins table for admin users

CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'technician' CHECK (role IN ('super_admin', 'manager', 'technician')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_admins_username ON admins(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_admins_email ON admins(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_admins_role ON admins(role);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- Create trigger to update updated_at
CREATE TRIGGER update_admins_timestamp 
BEFORE UPDATE ON admins 
FOR EACH ROW 
EXECUTE FUNCTION update_timestamp();
