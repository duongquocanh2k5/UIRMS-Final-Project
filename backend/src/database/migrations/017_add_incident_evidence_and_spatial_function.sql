ALTER TABLE incident_images
  ADD COLUMN IF NOT EXISTS is_before BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS uploaded_by_admin BIGINT REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incident_images_uploaded_by_admin
  ON incident_images(uploaded_by_admin);

CREATE EXTENSION IF NOT EXISTS postgis;

DROP FUNCTION IF EXISTS get_incidents_near_location(NUMERIC, NUMERIC, INTEGER);

CREATE OR REPLACE FUNCTION get_incidents_near_location(
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_distance_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  incident_id BIGINT,
  title VARCHAR,
  distance_meters NUMERIC,
  status VARCHAR,
  priority VARCHAR
) AS $$
  SELECT
    i.id::BIGINT AS incident_id,
    i.title,
    ROUND(ST_Distance(
      i.location_point::GEOGRAPHY,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY
    )::NUMERIC, 2) AS distance_meters,
    i.status::VARCHAR,
    i.priority::VARCHAR
  FROM incidents i
  WHERE i.deleted_at IS NULL
    AND i.location_point IS NOT NULL
    AND ST_DWithin(
      i.location_point::GEOGRAPHY,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY,
      p_distance_meters
    )
  ORDER BY 3 ASC
$$ LANGUAGE SQL STABLE;