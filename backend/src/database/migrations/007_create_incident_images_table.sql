-- 007_create_incident_images_table.sql
-- Create incident images table for image uploads

CREATE TABLE incident_images (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumb_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(50),
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_incident_images_incident_id ON incident_images(incident_id);
CREATE INDEX idx_incident_images_uploaded_by ON incident_images(uploaded_by);
CREATE INDEX idx_incident_images_created_at ON incident_images(created_at DESC);
