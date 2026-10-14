ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_admins_last_seen_at
  ON admins (last_seen_at)
  WHERE deleted_at IS NULL;