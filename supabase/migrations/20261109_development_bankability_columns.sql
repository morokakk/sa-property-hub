-- Migration: 20261109_development_bankability_columns.sql
-- Description: Add South African bankability columns to public.developments and default pre-sales hurdle to public.profiles

-- 1. Add bankability columns to developments
ALTER TABLE public.developments
  ADD COLUMN IF NOT EXISTS is_deferred_land_payment_laa boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS senior_jv_partner_name text;

-- 2. Add default pre-sales hurdle percent to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_pre_sales_hurdle_percent numeric DEFAULT 40.0;

-- 3. Refresh investor_profiles view to include newly added columns
CREATE OR REPLACE VIEW public.investor_profiles
WITH (security_invoker = true)
AS SELECT * FROM public.profiles;

REVOKE ALL ON public.investor_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_profiles TO authenticated;

-- 4. Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
