-- Create a default dataset for existing inventory
INSERT INTO public.datasets (name, source, is_active, book_count)
VALUES ('Existing Inventory', 'manual_upload', true, 0)
ON CONFLICT DO NOTHING;

-- Link all books without a dataset to the default dataset
UPDATE public.books
SET dataset_id = (SELECT id FROM public.datasets WHERE name = 'Existing Inventory' LIMIT 1)
WHERE dataset_id IS NULL;