-- Migration: 20261022_profiles_underwriting_schema_parity.sql
-- Description: Add missing underwriting and tax parameters to public.profiles table and refresh investor_profiles view (DBSYNC-08)

-- 1. Add missing underwriting & tax hurdle columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS min_net_yield_percent numeric DEFAULT 8.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS min_monthly_cashflow_zar numeric DEFAULT 1500;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS min_net_roi_percent numeric DEFAULT 8.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS min_flip_roi_percent numeric DEFAULT 18.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_day1_cash_zar numeric DEFAULT 500000;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS min_dscr numeric DEFAULT 1.20;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vat_exempt_agent boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marginal_tax_rate_percent numeric DEFAULT 31.0;

-- 2. Refresh investor_profiles security_invoker view to include newly added columns
DROP VIEW IF EXISTS public.investor_profiles;
CREATE OR REPLACE VIEW public.investor_profiles
WITH (security_invoker = true)
AS SELECT * FROM public.profiles;

REVOKE ALL ON public.investor_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_profiles TO authenticated;

-- 3. Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
