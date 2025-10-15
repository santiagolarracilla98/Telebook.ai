-- Delete duplicate books, keeping only the oldest entry for each title/author combination
DELETE FROM books
WHERE id IN (
  SELECT b.id
  FROM books b
  INNER JOIN (
    SELECT title, author, MIN(created_at) as first_created
    FROM books
    GROUP BY title, author
    HAVING COUNT(*) > 1
  ) d ON b.title = d.title AND b.author = d.author
  WHERE b.created_at > d.first_created
);

-- Add unique constraint to prevent duplicate books in the future
ALTER TABLE books
ADD CONSTRAINT books_title_author_unique UNIQUE (title, author);