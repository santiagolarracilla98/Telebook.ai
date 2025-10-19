-- Add column to datasets table to track if books without publisher prices should be excluded from client view
ALTER TABLE public.datasets 
ADD COLUMN exclude_books_without_price boolean DEFAULT false;