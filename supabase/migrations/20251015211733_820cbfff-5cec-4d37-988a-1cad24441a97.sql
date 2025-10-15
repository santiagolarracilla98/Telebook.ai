-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create books inventory table
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uk_asin text,
  us_asin text,
  title text NOT NULL,
  author text NOT NULL,
  available_stock integer NOT NULL DEFAULT 0,
  rrp numeric(10, 2) NOT NULL,
  wholesale_price numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (since this is a wholesale catalog)
CREATE POLICY "Books are viewable by everyone"
  ON public.books
  FOR SELECT
  USING (true);

-- Create index for better search performance
CREATE INDEX idx_books_title ON public.books USING gin(to_tsvector('english', title));
CREATE INDEX idx_books_author ON public.books USING gin(to_tsvector('english', author));

-- Create updated_at trigger
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();