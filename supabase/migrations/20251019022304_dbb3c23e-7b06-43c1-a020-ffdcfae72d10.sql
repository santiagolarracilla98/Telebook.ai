-- Restore public read access to datasets table
-- The books catalog needs to join with datasets to show active inventory
-- The created_by UUID exposure is minimal security risk (not PII)

DROP POLICY IF EXISTS "Hosts can view datasets" ON public.datasets;

CREATE POLICY "Everyone can view datasets" 
ON public.datasets 
FOR SELECT 
USING (true);