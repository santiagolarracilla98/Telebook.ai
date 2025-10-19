-- Add price_source column to track where prices come from
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS price_source TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.books.price_source IS 'Source of the publisher_rrp: isbndb, google_books, amazon, estimated, manual';

-- Add an index for filtering books by price source
CREATE INDEX IF NOT EXISTS idx_books_price_source ON public.books(price_source);

-- Add an index for filtering books without publisher pricing
CREATE INDEX IF NOT EXISTS idx_books_no_publisher_rrp ON public.books(publisher_rrp) WHERE publisher_rrp IS NULL;