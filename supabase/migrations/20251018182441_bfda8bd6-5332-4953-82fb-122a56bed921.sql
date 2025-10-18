-- Create wishlist table for users to save books
CREATE TABLE public.wishlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Users can view their own wishlist
CREATE POLICY "Users can view their own wishlist"
ON public.wishlist
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add to their own wishlist
CREATE POLICY "Users can add to their own wishlist"
ON public.wishlist
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own wishlist
CREATE POLICY "Users can remove from their own wishlist"
ON public.wishlist
FOR DELETE
USING (auth.uid() = user_id);

-- Create account_tiers table to track user subscription status
CREATE TABLE public.account_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'freemium' CHECK (tier IN ('freemium', 'premium')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_tiers ENABLE ROW LEVEL SECURITY;

-- Users can view their own account tier
CREATE POLICY "Users can view their own account tier"
ON public.account_tiers
FOR SELECT
USING (auth.uid() = user_id);

-- Create trigger to auto-create account tier for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_account_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.account_tiers (user_id, tier)
  VALUES (new.id, 'freemium');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created_account_tier
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_account_tier();