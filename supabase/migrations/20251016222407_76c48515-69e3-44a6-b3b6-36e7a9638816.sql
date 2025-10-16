-- Drop the restrictive anonymous policy
DROP POLICY IF EXISTS "Anonymous users cannot view books" ON books;

-- Update the authenticated policy to allow everyone to read
DROP POLICY IF EXISTS "Authenticated users can view books" ON books;

CREATE POLICY "Everyone can view books"
  ON books
  FOR SELECT
  USING (true);