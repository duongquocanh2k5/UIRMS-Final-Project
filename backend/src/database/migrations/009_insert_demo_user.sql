-- 009_insert_demo_user.sql
-- Insert a reusable demo user for quick login during development.

INSERT INTO users (phone, email, password_hash, full_name, is_verified, bio)
VALUES
  ('0900000000', 'demo@uirms.com', '$2b$10$ovk1Zykfw3LrPJp/58jjEuL4K.oVgqM2dC8Vqc1J7tTX9e6jKvXDG', 'Người dùng demo', true, 'Tài khoản demo để đăng nhập nhanh')
ON CONFLICT (phone) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  is_verified = EXCLUDED.is_verified,
  bio = EXCLUDED.bio,
  updated_at = NOW();
