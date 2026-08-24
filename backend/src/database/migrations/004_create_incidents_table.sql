-- 004_create_incidents_table.sql
-- Create incidents table with PostGIS spatial support

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location_name VARCHAR(255),
  location_point GEOMETRY(Point, 4326),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'rejected')),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_technician INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ai_confidence DECIMAL(3,2),
  ai_suggested_category INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of INTEGER REFERENCES incidents(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create spatial index for faster location queries
CREATE INDEX idx_incidents_location ON incidents USING GIST(location_point);

-- Create other indexes
CREATE INDEX idx_incidents_user_id ON incidents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_category_id ON incidents(category_id);
CREATE INDEX idx_incidents_status ON incidents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_assigned_to ON incidents(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC) WHERE deleted_at IS NULL;

-- Create trigger to update updated_at
CREATE TRIGGER update_incidents_timestamp 
BEFORE UPDATE ON incidents 
FOR EACH ROW 
EXECUTE FUNCTION update_timestamp();
