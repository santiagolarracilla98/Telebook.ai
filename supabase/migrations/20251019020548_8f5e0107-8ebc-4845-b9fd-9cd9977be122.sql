-- Fix datasets table RLS to restrict SELECT access to authenticated hosts only
-- This prevents exposing user IDs to unauthenticated users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Everyone can view datasets" ON public.datasets;

-- Create a new policy that only allows authenticated hosts to view datasets
CREATE POLICY "Hosts can view datasets" 
ON public.datasets 
FOR SELECT 
USING (has_role(auth.uid(), 'host'::app_role));