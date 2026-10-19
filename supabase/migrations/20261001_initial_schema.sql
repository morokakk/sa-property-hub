-- Migration: 20261001_initial_schema.sql
-- Description: Baseline DDL for all 8 SA Property Portfolio Hub tables, covering indexes, and RLS policies (DBSYNC-04, DBSYNC-09, DBSYNC-10)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_name text NOT NULL DEFAULT '',
  trading_as text,
  registration_or_id text,
  contact_number text,
  email text,
  website text,
  physical_address text,
  logo_base64 text,
  bio_summary text DEFAULT '',
  default_prime_rate_percent numeric DEFAULT 11.75,
  baseline_hurdle_yield_percent numeric DEFAULT 10.0,
  default_agent_commission_percent numeric DEFAULT 5.0,
  default_tax_entity_type text DEFAULT 'Company (27%)',
  min_net_yield_percent numeric DEFAULT 8.0,
  min_monthly_cashflow_zar numeric DEFAULT 1500,
  min_net_roi_percent numeric DEFAULT 8.0,
  min_flip_roi_percent numeric DEFAULT 18.0,
  max_day1_cash_zar numeric DEFAULT 500000,
  min_dscr numeric DEFAULT 1.20,
  vat_exempt_agent boolean DEFAULT false,
  marginal_tax_rate_percent numeric DEFAULT 31.0,
  liquid_capital_reserve_zar numeric DEFAULT 0,
  rental_forecast_view text DEFAULT 'wealth-only',
  ai_settings jsonb DEFAULT '{"model": "claude-sonnet-5", "provider": "anthropic"}'::jsonb,
  analyzer_draft jsonb DEFAULT '{}'::jsonb,
  bank_name text,
  account_holder text,
  account_number text,
  account_type text DEFAULT 'Cheque / Current',
  branch_code text,
  swift_code text,
  remittance_instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. PROPERTIES (Rentals)
CREATE TABLE IF NOT EXISTS public.properties (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Johannesburg',
  province text,
  property_type text DEFAULT 'Sectional Title Apartment',
  source text,
  number_of_units integer DEFAULT 1,
  floor_area_sqm numeric DEFAULT NULL,
  agm_date date,
  market_value_zar numeric DEFAULT 0,
  purchase_price_zar numeric DEFAULT 0,
  purchase_date date DEFAULT CURRENT_DATE,
  outstanding_bond_balance_zar numeric DEFAULT 0,
  bond_interest_rate_percent numeric DEFAULT 11.75,
  monthly_bond_payment_zar numeric DEFAULT 0,
  bond_payment_effective_date text,
  bond_revision_note text,
  management_type text DEFAULT 'Agency',
  agency_name text,
  agency_commission_percent numeric DEFAULT 8.0,
  agency_vat_applicable boolean DEFAULT true,
  agency_contact text,
  monthly_gross_rent_zar numeric DEFAULT 0,
  monthly_levies_zar numeric DEFAULT 0,
  monthly_rates_taxes_zar numeric DEFAULT 0,
  monthly_agent_fee_zar numeric DEFAULT 0,
  monthly_maintenance_reserve_zar numeric DEFAULT 0,
  annual_building_insurance_zar numeric DEFAULT 0,
  unpaid_utility_arrears_zar numeric DEFAULT 0,
  arrears_opening_balance_zar numeric DEFAULT 0,
  arrears_write_offs jsonb DEFAULT '[]'::jsonb,
  payment_records jsonb DEFAULT '[]'::jsonb,
  transactions jsonb DEFAULT '[]'::jsonb,
  maintenance_history jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'Occupied',
  leases jsonb DEFAULT '[]'::jsonb,
  archived_leases jsonb DEFAULT '[]'::jsonb,
  coc_checklist jsonb DEFAULT '{}'::jsonb,
  drive_vault jsonb DEFAULT '{}'::jsonb,
  utility_statements jsonb DEFAULT '[]'::jsonb,
  meter_readings jsonb DEFAULT '[]'::jsonb,
  meter_registry jsonb DEFAULT '[]'::jsonb,
  tax_entity_type_override text,
  section_13sex_annual_shield_zar numeric DEFAULT 0,
  utility_type text DEFAULT 'postpaid',
  prepaid_vendor_name text,
  monthly_prepaid_vending_fee_zar numeric DEFAULT 0,
  monthly_communal_services_zar numeric DEFAULT 0,
  ancillary_incomes jsonb DEFAULT '[]'::jsonb,
  is_brrrr_property boolean DEFAULT false,
  converted_from_flip_id text,
  total_equity_extracted_zar numeric DEFAULT 0,
  refinance_history jsonb DEFAULT '[]'::jsonb,
  funding_required_zar numeric,
  capital_raised_zar numeric,
  primary_funder_name text,
  primary_funder_contact text,
  primary_funder_type text,
  co_funders_notes text,
  promised_return_type text,
  promised_return_rate_percent numeric,
  promised_payout_schedule text,
  security_offered text,
  actual_sale_price_zar numeric,
  net_cash_proceeds_zar numeric,
  sold_date date,
  exit_notes text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. FLIPS
CREATE TABLE IF NOT EXISTS public.flips (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT 'Johannesburg',
  province text,
  property_type text DEFAULT 'Sectional Title Apartment',
  number_of_units integer DEFAULT 1,
  floor_area_sqm numeric DEFAULT NULL,
  agm_date date,
  purchase_date date DEFAULT CURRENT_DATE,
  purchase_price_zar numeric DEFAULT 0,
  acquisition_costs_zar numeric DEFAULT 0,
  baseline_renovation_budget_zar numeric DEFAULT 0,
  strategy text DEFAULT 'Flip',
  source text,
  estimated_duration_months integer DEFAULT 6,
  monthly_holding_cost_zar numeric DEFAULT 0,
  monthly_bond_payment_zar numeric DEFAULT 0,
  monthly_levies_zar numeric DEFAULT 0,
  monthly_rates_taxes_zar numeric DEFAULT 0,
  monthly_other_holding_cost_zar numeric DEFAULT 0,
  municipal_valuation_zar numeric DEFAULT 0,
  bond_payment_effective_date text,
  target_exit_price_zar numeric DEFAULT 0,
  exit_commission_percent numeric DEFAULT 5.75,
  target_completion_date date,
  current_phase text DEFAULT 'Acquisition & Conveyancing',
  linked_funding_ids text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'Active',
  notes text,
  coc_checklist jsonb DEFAULT '{}'::jsonb,
  drive_vault jsonb DEFAULT '{}'::jsonb,
  funding_required_zar numeric DEFAULT 0,
  capital_raised_zar numeric DEFAULT 0,
  primary_funder_name text,
  primary_funder_contact text,
  primary_funder_type text,
  co_funders_notes text,
  promised_return_type text,
  promised_return_rate_percent numeric DEFAULT 0,
  promised_payout_schedule text,
  security_offered text,
  actual_sale_price_zar numeric,
  net_cash_proceeds_zar numeric,
  sold_date date,
  exit_notes text,
  exit_strategy text DEFAULT 'Sold',
  converted_to_rental_id text,
  tax_entity_type text DEFAULT 'Company (27%)',
  municipal_clearance jsonb DEFAULT '{}'::jsonb,
  draw_schedule jsonb DEFAULT '{}'::jsonb,
  occupant_risk jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. BOQ ITEMS
CREATE TABLE IF NOT EXISTS public.boq_items (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  flip_id text NOT NULL REFERENCES public.flips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_description text NOT NULL,
  unit text NOT NULL DEFAULT 'unit',
  quantity numeric NOT NULL DEFAULT 1,
  baseline_unit_cost_zar numeric NOT NULL DEFAULT 0,
  baseline_total_zar numeric NOT NULL DEFAULT 0,
  actual_cost_zar numeric NOT NULL DEFAULT 0,
  variance_zar numeric NOT NULL DEFAULT 0,
  supplier_or_contractor text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Not Started',
  invoice_ref text,
  milestone_phase text,
  retention_percent numeric,
  is_sponsored_or_barter boolean,
  commercial_retail_value_zar numeric,
  actual_cash_outflow_zar numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. FUNDING SOURCES
CREATE TABLE IF NOT EXISTS public.funding_sources (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lender_name text NOT NULL,
  entity_or_contact text,
  contact_person text,
  email_phone text NOT NULL DEFAULT '',
  funding_type text NOT NULL DEFAULT 'Private Lender',
  capital_amount_zar numeric NOT NULL DEFAULT 0,
  return_terms_type text NOT NULL DEFAULT 'Fixed Interest',
  return_rate_percent numeric NOT NULL DEFAULT 0,
  payment_schedule text NOT NULL DEFAULT 'Monthly Interest',
  disbursement_date text NOT NULL DEFAULT '',
  maturity_date text NOT NULL DEFAULT '',
  original_maturity_date text,
  delay_extension_days integer DEFAULT 0,
  delay_notes text,
  security_offered text,
  linked_deal_id text,
  linked_deal_name text,
  total_repaid_zar numeric NOT NULL DEFAULT 0,
  total_interest_paid_zar numeric DEFAULT 0,
  tranches jsonb DEFAULT '[]'::jsonb,
  notes text,
  status text NOT NULL DEFAULT 'Active',
  last_payment_reference text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. OPPORTUNITIES
CREATE TABLE IF NOT EXISTS public.opportunities (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  address text NOT NULL,
  city text NOT NULL DEFAULT 'Johannesburg',
  province text NOT NULL DEFAULT 'Gauteng',
  property_type text,
  source text NOT NULL DEFAULT 'Direct Owner',
  strategy text NOT NULL DEFAULT 'Rental',
  open_market_value_zar numeric NOT NULL DEFAULT 0,
  purchase_price_zar numeric NOT NULL DEFAULT 0,
  built_in_equity_zar numeric NOT NULL DEFAULT 0,
  built_in_equity_percent numeric NOT NULL DEFAULT 0,
  estimated_rehab_cost_zar numeric NOT NULL DEFAULT 0,
  monthly_rental_estimate_zar numeric NOT NULL DEFAULT 0,
  monthly_levies_zar numeric NOT NULL DEFAULT 0,
  monthly_rates_taxes_zar numeric NOT NULL DEFAULT 0,
  annual_insurance_zar numeric NOT NULL DEFAULT 0,
  management_fee_percent numeric NOT NULL DEFAULT 8.0,
  agency_vat_applicable boolean DEFAULT true,
  vacancy_rate_percent numeric NOT NULL DEFAULT 5.0,
  target_exit_price_zar numeric NOT NULL DEFAULT 0,
  exit_commission_percent numeric DEFAULT 5.75,
  vat_exempt_agent boolean DEFAULT false,
  holding_period_months integer NOT NULL DEFAULT 6,
  interest_rate_margin numeric DEFAULT 0,
  monthly_holding_cost_zar numeric DEFAULT 0,
  monthly_bond_payment_zar numeric DEFAULT 0,
  monthly_other_holding_cost_zar numeric DEFAULT 0,
  monthly_maintenance_reserve_zar numeric DEFAULT 0,
  monthly_prepaid_vending_fee_zar numeric DEFAULT 0,
  monthly_communal_services_zar numeric DEFAULT 0,
  number_of_units integer DEFAULT 1,
  floor_area_sqm numeric DEFAULT 0,
  is_vat_inclusive_developer_sale boolean DEFAULT false,
  tenant_placement_fee_percent numeric DEFAULT 0,
  amenity_scorecard jsonb,
  costs jsonb,
  drive_vault jsonb,
  notes text,
  status text NOT NULL DEFAULT 'Lead',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Pending',
  linked_entity jsonb NOT NULL DEFAULT '{}'::jsonb,
  recurrence text DEFAULT 'None',
  recurrence_end_date date,
  recurrence_group_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 8. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  contact_person text,
  phone text NOT NULL DEFAULT '',
  email text,
  rating integer NOT NULL DEFAULT 3,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- COVERING B-TREE AND GIN INDEXES (DBSYNC-09, DBSYNC-10)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_flips_user_id ON public.flips(user_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_user_id ON public.boq_items(user_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_flip_id ON public.boq_items(flip_id);
CREATE INDEX IF NOT EXISTS idx_funding_sources_user_id ON public.funding_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON public.opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_leases_gin ON public.properties USING gin (leases);
CREATE INDEX IF NOT EXISTS idx_properties_archived_leases_gin ON public.properties USING gin (archived_leases);

-- STANDARDIZED RLS POLICIES USING (select auth.uid()) = user_id (DBSYNC-10)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Profiles
  DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
  CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
  CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
  CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
  CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Properties
  DROP POLICY IF EXISTS properties_select_own ON public.properties;
  CREATE POLICY properties_select_own ON public.properties FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS properties_insert_own ON public.properties;
  CREATE POLICY properties_insert_own ON public.properties FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS properties_update_own ON public.properties;
  CREATE POLICY properties_update_own ON public.properties FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS properties_delete_own ON public.properties;
  CREATE POLICY properties_delete_own ON public.properties FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Flips
  DROP POLICY IF EXISTS flips_select_own ON public.flips;
  CREATE POLICY flips_select_own ON public.flips FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS flips_insert_own ON public.flips;
  CREATE POLICY flips_insert_own ON public.flips FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS flips_update_own ON public.flips;
  CREATE POLICY flips_update_own ON public.flips FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS flips_delete_own ON public.flips;
  CREATE POLICY flips_delete_own ON public.flips FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- BOQ Items
  DROP POLICY IF EXISTS boq_items_select_own ON public.boq_items;
  CREATE POLICY boq_items_select_own ON public.boq_items FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS boq_items_insert_own ON public.boq_items;
  CREATE POLICY boq_items_insert_own ON public.boq_items FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS boq_items_update_own ON public.boq_items;
  CREATE POLICY boq_items_update_own ON public.boq_items FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS boq_items_delete_own ON public.boq_items;
  CREATE POLICY boq_items_delete_own ON public.boq_items FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Funding Sources
  DROP POLICY IF EXISTS funding_sources_select_own ON public.funding_sources;
  CREATE POLICY funding_sources_select_own ON public.funding_sources FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS funding_sources_insert_own ON public.funding_sources;
  CREATE POLICY funding_sources_insert_own ON public.funding_sources FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS funding_sources_update_own ON public.funding_sources;
  CREATE POLICY funding_sources_update_own ON public.funding_sources FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS funding_sources_delete_own ON public.funding_sources;
  CREATE POLICY funding_sources_delete_own ON public.funding_sources FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Opportunities
  DROP POLICY IF EXISTS opportunities_select_own ON public.opportunities;
  CREATE POLICY opportunities_select_own ON public.opportunities FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS opportunities_insert_own ON public.opportunities;
  CREATE POLICY opportunities_insert_own ON public.opportunities FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS opportunities_update_own ON public.opportunities;
  CREATE POLICY opportunities_update_own ON public.opportunities FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS opportunities_delete_own ON public.opportunities;
  CREATE POLICY opportunities_delete_own ON public.opportunities FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Tasks
  DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
  CREATE POLICY tasks_select_own ON public.tasks FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
  CREATE POLICY tasks_insert_own ON public.tasks FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
  CREATE POLICY tasks_update_own ON public.tasks FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
  CREATE POLICY tasks_delete_own ON public.tasks FOR DELETE USING ((SELECT auth.uid()) = user_id);

  -- Suppliers
  DROP POLICY IF EXISTS suppliers_select_own ON public.suppliers;
  CREATE POLICY suppliers_select_own ON public.suppliers FOR SELECT USING ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS suppliers_insert_own ON public.suppliers;
  CREATE POLICY suppliers_insert_own ON public.suppliers FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS suppliers_update_own ON public.suppliers;
  CREATE POLICY suppliers_update_own ON public.suppliers FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
  DROP POLICY IF EXISTS suppliers_delete_own ON public.suppliers;
  CREATE POLICY suppliers_delete_own ON public.suppliers FOR DELETE USING ((SELECT auth.uid()) = user_id);
END $$;
