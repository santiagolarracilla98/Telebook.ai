-- Phase 1: Database Foundation for Dataset-Based Inventory Control (Alternative Approach)

-- 1. Create enum for dataset source types
CREATE TYPE dataset_source_type AS ENUM (
  'manual_upload',
  'google_books',
  'bowker_api',
  'onix_feed',
  'keepa_import'
);

-- 2. Add new columns to datasets table
ALTER TABLE datasets 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS book_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- 3. Create a new column with enum type and copy data
ALTER TABLE datasets 
ADD COLUMN IF NOT EXISTS source_type dataset_source_type DEFAULT 'manual_upload';

-- Update the new column based on existing source text values
UPDATE datasets 
SET source_type = CASE 
  WHEN source = 'google_books' THEN 'google_books'::dataset_source_type
  WHEN source = 'bowker_api' THEN 'bowker_api'::dataset_source_type
  WHEN source = 'onix_feed' THEN 'onix_feed'::dataset_source_type
  WHEN source = 'keepa_import' THEN 'keepa_import'::dataset_source_type
  ELSE 'manual_upload'::dataset_source_type
END;

-- Drop the old text column and rename the new one
ALTER TABLE datasets DROP COLUMN source;
ALTER TABLE datasets RENAME COLUMN source_type TO source;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_datasets_active ON datasets(is_active);

-- 5. Add Google Books metadata columns to books table
ALTER TABLE books
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS publisher TEXT,
ADD COLUMN IF NOT EXISTS published_date DATE,
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS preview_link TEXT,
ADD COLUMN IF NOT EXISTS info_link TEXT,
ADD COLUMN IF NOT EXISTS google_books_id TEXT UNIQUE;

-- 6. Update RLS policy for dataset ownership
CREATE POLICY "Hosts can manage their datasets"
  ON datasets
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'host'::app_role) 
    AND created_by = auth.uid()
  );

-- 7. Add trigger to update dataset book_count
CREATE OR REPLACE FUNCTION update_dataset_book_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE datasets 
    SET book_count = book_count + 1 
    WHERE id = NEW.dataset_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE datasets 
    SET book_count = book_count - 1 
    WHERE id = OLD.dataset_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dataset_book_count
AFTER INSERT OR DELETE ON books
FOR EACH ROW
EXECUTE FUNCTION update_dataset_book_count();