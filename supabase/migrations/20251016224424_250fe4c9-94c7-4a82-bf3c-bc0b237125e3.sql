-- Fix security warning: Set search_path for the trigger function
CREATE OR REPLACE FUNCTION update_dataset_book_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;