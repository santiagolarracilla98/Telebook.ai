-- Create trigger to automatically update dataset book counts
CREATE TRIGGER update_dataset_book_count_trigger
AFTER INSERT OR DELETE ON books
FOR EACH ROW
EXECUTE FUNCTION update_dataset_book_count();

-- Fix the current book count for Existing Inventory dataset
UPDATE datasets 
SET book_count = (SELECT COUNT(*) FROM books WHERE dataset_id = datasets.id)
WHERE id = '4f97da31-9f2b-4032-ab5c-dd86a25a03b2';