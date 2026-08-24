-- 008_create_incident_comments_table.sql
-- Create comments table for incident discussions

CREATE TABLE incident_comments (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_incident_comments_incident_id ON incident_comments(incident_id);
CREATE INDEX idx_incident_comments_user_id ON incident_comments(user_id);
CREATE INDEX idx_incident_comments_created_at ON incident_comments(created_at DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_incident_comments_timestamp 
BEFORE UPDATE ON incident_comments 
FOR EACH ROW 
EXECUTE FUNCTION update_timestamp();
