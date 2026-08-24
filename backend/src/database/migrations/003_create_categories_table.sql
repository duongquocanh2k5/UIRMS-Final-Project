-- 003_create_categories_table.sql
-- Create categories table for incident types

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  color_code VARCHAR(7),
  severity_weight INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_categories_name ON categories(LOWER(name));
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_severity ON categories(severity_weight DESC);

-- Create trigger to update updated_at
CREATE TRIGGER update_categories_timestamp 
BEFORE UPDATE ON categories 
FOR EACH ROW 
EXECUTE FUNCTION update_timestamp();

-- Insert default categories
INSERT INTO categories (name, description, icon_url, color_code, severity_weight) VALUES
('Đường hỏng', 'Vết nứt, lỗ hổng trên đường', '🛣️', '#FF5252', 2),
('Mất điện', 'Đèn giao thông hỏng, mất điện', '💡', '#FFC107', 3),
('Tắc đường', 'Giao thông tắc, kẹt xe', '🚗', '#FF9800', 2),
('Rác thải', 'Rác trên đường, bẩn', '♻️', '#4CAF50', 1),
('An toàn công cộng', 'Nguy hiểm công cộng', '⚠️', '#F44336', 5),
('Cây cối', 'Cây bị hư hại, cần cắt', '🌳', '#8BC34A', 2),
('Nước thải', 'Ống nước hỏng, nước thải', '💧', '#03A9F4', 3),
('Thang máy', 'Thang máy hỏng', '🛗', '#9C27B0', 4);
