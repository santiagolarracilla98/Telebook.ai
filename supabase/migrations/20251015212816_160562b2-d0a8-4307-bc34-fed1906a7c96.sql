-- Add image_url column to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS image_url text;