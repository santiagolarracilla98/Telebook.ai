-- Allow books to be imported without pricing data
ALTER TABLE books 
ALTER COLUMN wholesale_price DROP NOT NULL,
ALTER COLUMN rrp DROP NOT NULL;