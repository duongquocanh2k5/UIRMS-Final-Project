-- 010_add_identity_number_to_users.sql
-- Add identity_number to users for Vietnamese citizen ID (CMND/CCCD)

ALTER TABLE users
  ADD COLUMN identity_number VARCHAR(20);

CREATE UNIQUE INDEX idx_users_identity_number ON users(identity_number) WHERE identity_number IS NOT NULL AND deleted_at IS NULL;
