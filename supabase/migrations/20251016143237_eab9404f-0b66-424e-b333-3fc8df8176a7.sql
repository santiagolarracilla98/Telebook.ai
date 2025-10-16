-- Remove the public SELECT policy on books table
DROP POLICY IF EXISTS "Books are viewable by everyone" ON public.books;

-- Create a new policy that only allows authenticated users to view books
CREATE POLICY "Authenticated users can view books"
ON public.books
FOR SELECT
TO authenticated
USING (true);

-- Create a more restrictive policy for anonymous users (they should not see real data)
CREATE POLICY "Anonymous users cannot view books"
ON public.books
FOR SELECT
TO anon
USING (false);