-- Migration: 20261121_schema_parity_v2.sql
-- Description: Complete SQL schema parity for profiles, opportunities, and suppliers (DB-01)
--              and harden schema inspection view & RPC against anon access (SEC-V2-02).

-- 1. Profiles development underwriting defaults (4 columns)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS min_dev_poc_percent numeric DEFAULT 20.0,
  ADD COLUMN IF NOT EXISTS min_dev_yoc_percent numeric DEFAULT 12.0,
  ADD COLUMN IF NOT EXISTS default_hard_build_rate_per_sqm_zar numeric DEFAULT 9800,
  ADD COLUMN IF NOT EXISTS default_vat_registered_developer boolean DEFAULT true;

-- Refresh investor_profiles view with security_invoker = true so new columns are exposed safely
CREATE OR REPLACE VIEW public.investor_profiles
WITH (security_invoker = true) AS
SELECT * FROM public.profiles;

REVOKE ALL ON public.investor_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.investor_profiles TO authenticated;

-- 2. Opportunities full mapper parity (37 columns)
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS agm_date date,
  ADD COLUMN IF NOT EXISTS loan_to_value_percent numeric DEFAULT 80.0,
  ADD COLUMN IF NOT EXISTS bond_ltv numeric DEFAULT 80.0,
  ADD COLUMN IF NOT EXISTS deposit_zar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_rate_percent numeric DEFAULT 11.75,
  ADD COLUMN IF NOT EXISTS loan_term_years integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS annual_capital_growth_percent numeric DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS annual_rental_escalation_percent numeric DEFAULT 6.0,
  ADD COLUMN IF NOT EXISTS annual_expense_inflation_percent numeric DEFAULT 6.0,
  ADD COLUMN IF NOT EXISTS bond_term_years integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS custom_transfer_duty_zar numeric,
  ADD COLUMN IF NOT EXISTS custom_conveyancing_zar numeric,
  ADD COLUMN IF NOT EXISTS custom_bond_reg_zar numeric,
  ADD COLUMN IF NOT EXISTS auctioneer_commission_zar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS municipal_arrears_zar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_yield numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cap_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_roi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_cash_flow_zar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initial_capital_required_zar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_flip_net_profit_zar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projected_flip_roi numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funding_required_zar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capital_raised_zar numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS primary_funder_name text,
  ADD COLUMN IF NOT EXISTS primary_funder_contact text,
  ADD COLUMN IF NOT EXISTS primary_funder_type text,
  ADD COLUMN IF NOT EXISTS co_funders_notes text,
  ADD COLUMN IF NOT EXISTS promised_return_type text,
  ADD COLUMN IF NOT EXISTS promised_return_rate_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promised_payout_schedule text,
  ADD COLUMN IF NOT EXISTS security_offered text,
  ADD COLUMN IF NOT EXISTS section_13sex jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ancillary_incomes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pass_reason text,
  ADD COLUMN IF NOT EXISTS pass_notes text,
  ADD COLUMN IF NOT EXISTS passed_at timestamp with time zone;

-- 3. Suppliers parity (4 columns)
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS branch_location text DEFAULT 'Johannesburg',
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS discount_terms text,
  ADD COLUMN IF NOT EXISTS has_coc boolean DEFAULT false;

-- 4. SEC-V2-02: Harden schema inspection view & RPC (revoke anon & PUBLIC)
CREATE OR REPLACE VIEW public.schema_columns_inspection
WITH (security_invoker = true) AS
SELECT c.table_name::text, c.column_name::text, c.data_type::text, c.is_nullable::text
FROM information_schema.columns c
WHERE c.table_schema = 'public';

REVOKE ALL ON public.schema_columns_inspection FROM PUBLIC, anon;
GRANT SELECT ON public.schema_columns_inspection TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_schema_columns(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_schema_columns(text) TO authenticated, service_role;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
