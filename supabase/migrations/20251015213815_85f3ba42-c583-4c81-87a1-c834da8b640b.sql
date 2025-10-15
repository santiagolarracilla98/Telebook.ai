-- Add category column to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Fiction';