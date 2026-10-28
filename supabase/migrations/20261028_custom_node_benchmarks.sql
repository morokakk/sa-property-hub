-- Migration: 20261028_custom_node_benchmarks.sql
-- Description: Add custom_node_benchmarks jsonb column to public.profiles table and refresh investor_profiles view

-- 1. Add custom_node_benchmarks jsonb column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_node_benchmarks jsonb DEFAULT '{}'::jsonb;

-- 2. Refresh investor_profiles security_invoker view to include newly added column
DROP VIEW IF EXISTS public.investor_profiles;
CREATE OR REPLACE VIEW public.investor_profiles
WITH (security_invoker = true)
AS SELECT * FROM public.profiles;

REVOKE ALL ON public.investor_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_profiles TO authenticated;

-- 3. Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
