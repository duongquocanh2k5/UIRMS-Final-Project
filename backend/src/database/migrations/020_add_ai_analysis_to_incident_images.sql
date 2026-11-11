ALTER TABLE incident_images
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
