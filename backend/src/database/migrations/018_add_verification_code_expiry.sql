-- Add verification_code_expires_at column to users table
-- This enables OTP expiry to prevent indefinite OTP reuse

ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP;

-- Set existing verification codes to expire immediately (force re-generation)
UPDATE users SET verification_code = NULL, verification_code_expires_at = NULL
WHERE verification_code IS NOT NULL;

