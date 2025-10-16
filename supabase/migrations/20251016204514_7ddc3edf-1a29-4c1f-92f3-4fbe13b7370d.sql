-- Create datasets table
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('upload', 'publisher_api')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view datasets"
ON public.datasets
FOR SELECT
USING (true);

CREATE POLICY "Hosts can manage datasets"
ON public.datasets
FOR ALL
USING (public.has_role(auth.uid(), 'host'::app_role));

-- Add new columns to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS dataset_id UUID REFERENCES public.datasets(id),
ADD COLUMN IF NOT EXISTS publisher_rrp NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS amazon_price NUMERIC,
ADD COLUMN IF NOT EXISTS amazon_fee NUMERIC,
ADD COLUMN IF NOT EXISTS roi_target_price NUMERIC,
ADD COLUMN IF NOT EXISTS market_flag TEXT CHECK (market_flag IN ('below_market', 'at_market', 'above_market'));

-- Create fee_schedules table
CREATE TABLE IF NOT EXISTS public.fee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory TEXT NOT NULL,
  category TEXT NOT NULL,
  referral_pct NUMERIC NOT NULL,
  closing_fee NUMERIC DEFAULT 0,
  fba_base NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(territory, category)
);

ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view fee schedules"
ON public.fee_schedules
FOR SELECT
USING (true);

CREATE POLICY "Hosts can manage fee schedules"
ON public.fee_schedules
FOR ALL
USING (public.has_role(auth.uid(), 'host'::app_role));

-- Seed initial fee schedules
INSERT INTO public.fee_schedules(territory, category, referral_pct, closing_fee, fba_base)
VALUES
('UK', 'Books', 0.15, 0, 0),
('US', 'Books', 0.15, 0, 0)
ON CONFLICT (territory, category) DO NOTHING;

-- Create publisher_prices table
CREATE TABLE IF NOT EXISTS public.publisher_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn TEXT NOT NULL,
  territory TEXT NOT NULL,
  price_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  price_type TEXT,
  source TEXT NOT NULL,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.publisher_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view publisher prices"
ON public.publisher_prices
FOR SELECT
USING (true);

CREATE POLICY "System can manage publisher prices"
ON public.publisher_prices
FOR ALL
USING (public.has_role(auth.uid(), 'host'::app_role));