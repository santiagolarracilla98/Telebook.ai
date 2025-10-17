-- Add last_price_check column to track when Amazon prices were last updated
ALTER TABLE books 
ADD COLUMN last_price_check timestamp with time zone;