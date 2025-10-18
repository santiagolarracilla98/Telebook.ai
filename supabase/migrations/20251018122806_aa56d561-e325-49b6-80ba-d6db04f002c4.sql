-- Add ISBNdb-specific pricing columns to books table
-- These are separate from Amazon pricing and publisher pricing
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS isbndb_msrp numeric,
ADD COLUMN IF NOT EXISTS isbndb_price_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS isbndb_binding text,
ADD COLUMN IF NOT EXISTS isbndb_price_date timestamp with time zone;

-- Add index for faster queries on ISBNdb pricing
CREATE INDEX IF NOT EXISTS idx_books_isbndb_msrp ON public.books(isbndb_msrp) WHERE isbndb_msrp IS NOT NULL;

-- Add comment to document the new columns
COMMENT ON COLUMN public.books.isbndb_msrp IS 'MSRP price from ISBNdb API - separate from Amazon and publisher pricing';
COMMENT ON COLUMN public.books.isbndb_price_currency IS 'Currency code for ISBNdb MSRP (USD, GBP, etc.)';
COMMENT ON COLUMN public.books.isbndb_binding IS 'Book binding type from ISBNdb (affects pricing)';
COMMENT ON COLUMN public.books.isbndb_price_date IS 'Timestamp when ISBNdb pricing was fetched';